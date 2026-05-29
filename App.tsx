import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  Trash2, 
  History, 
  Droplets,
  LayoutDashboard
} from 'lucide-react';
import { UserProfile, IntakeLog, DailySummary } from './types';
import { STORAGE_KEYS, INTAKE_PRESETS, OTHER_DRINKS } from './constants';
import { getTodayKey, formatVolume, calculateStreaks } from './utils/calculations';
import SetupForm from './components/SetupForm';
import WaterWave from './components/WaterWave';
import HealthAnalysisCard from './components/HealthAnalysisCard';
import ManualInput from './components/ManualInput';
import HistoryChart from './components/HistoryChart';
import StreakBadge from './components/StreakBadge';

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<IntakeLog[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'trends'>('today');

  useEffect(() => {
    const savedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    const savedLogs = localStorage.getItem(STORAGE_KEYS.INTAKE_LOGS);
    if (savedProfile) setProfile(JSON.parse(savedProfile));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INTAKE_LOGS, JSON.stringify(logs));
  }, [logs]);

  const handleProfileComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(newProfile));
  };

  const addLog = (amount: number, type: string = "Water") => {
    const newLog: IntakeLog = {
      id: Math.random().toString(36).substr(2, 9),
      amount,
      type,
      timestamp: Date.now(),
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const deleteLog = (id: string) => {
    setLogs(prev => prev.filter(log => log.id !== id));
  };

  const todayKey = getTodayKey();
  const todayLogs = useMemo(() => {
    return logs.filter(log => new Date(log.timestamp).toISOString().split('T')[0] === todayKey);
  }, [logs, todayKey]);

  const todayTotal = todayLogs.reduce((acc, log) => acc + log.amount, 0);
  const progressPercentage = profile ? (todayTotal / profile.dailyGoal) * 100 : 0;
  
  const streakStats = useMemo(() => {
    if (!profile) return { currentStreak: 0, bestStreak: 0 };
    return calculateStreaks(logs, profile.dailyGoal);
  }, [logs, profile]);

  const historyData = useMemo<DailySummary[]>(() => {
    if (!profile) return [];
    const map = new Map<string, number>();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    last7Days.forEach(date => map.set(date, 0));
    logs.forEach(log => {
      const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
      if (map.has(dateKey)) map.set(dateKey, map.get(dateKey)! + log.amount);
    });
    return Array.from(map.entries()).map(([date, total]) => ({
      date,
      total,
      goal: profile.dailyGoal
    }));
  }, [logs, profile]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <SetupForm onComplete={handleProfileComplete} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32 text-slate-900 overflow-x-hidden selection:bg-slate-900/10">
      
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.1)] p-2 rounded-xl text-white">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none tracking-tight">Aqua tracker</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Status: {progressPercentage >= 100 ? 'Optimized' : 'Active'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge count={streakStats.currentStreak} />
          <button onClick={() => setProfile(null)} className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-6 space-y-12">
        {activeTab === 'today' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="absolute -inset-4 bg-slate-100 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <WaterWave percentage={progressPercentage} />
              </div>
              
              <div className="mt-10 text-center">
                <div className="text-7xl font-bold text-slate-900 tracking-tighter">
                  {formatVolume(todayTotal)}
                </div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className="h-[1px] w-8 bg-slate-100" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                    Goal: {formatVolume(profile.dailyGoal)}
                  </p>
                  <div className="h-[1px] w-8 bg-slate-100" />
                </div>
              </div>
            </div>

            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-3 bg-slate-900 rounded-full" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Quick Log</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {INTAKE_PRESETS.map((preset, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => addLog(preset.amount)} 
                    className="group flex flex-col items-start gap-4 p-5 bg-slate-50 border border-slate-100 rounded-[2rem] hover:border-slate-900/20 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 active:scale-95 text-left"
                  >
                    <div className="bg-white p-3 rounded-2xl text-slate-900 shadow-sm transition-colors border border-slate-100">
                      {preset.icon}
                    </div>
                    <div>
                      <span className="block font-bold text-2xl text-slate-900 tracking-tight">{preset.amount}ml</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-500">{preset.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-3 bg-slate-900 rounded-full" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Manual Entry</h3>
              </div>
              <ManualInput onAdd={(amount) => addLog(amount)} />
            </section>

            <HealthAnalysisCard profile={profile} currentIntake={todayTotal} />

            <section className="space-y-4 pb-20">
               <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 border border-slate-900/20 rounded-full" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Log History</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  {todayLogs.length} Entries
                </span>
              </div>
              <div className="space-y-3">
                {todayLogs.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-slate-400 text-xs tracking-wide">
                    Waiting for your first sip...
                  </div>
                ) : (
                  todayLogs.map(log => (
                    <div key={log.id} className="group bg-white p-5 rounded-3xl flex items-center justify-between border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                          <Droplets size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-xl text-slate-900 tracking-tight">+{log.amount}ml</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.type}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => deleteLog(log.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-3 bg-slate-900 rounded-full" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Performance Progress</h3>
              </div>
              <HistoryChart data={historyData} />
            </div>

            <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <StreakBadge count={streakStats.currentStreak} size="lg" />
              
              <div className="mt-12 grid grid-cols-2 w-full gap-8 border-t border-slate-200 pt-10">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Streak</div>
                  <div className="text-4xl font-bold text-slate-900 tracking-tighter">{streakStats.currentStreak} <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Days</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Best Record</div>
                  <div className="text-4xl font-bold text-slate-900 tracking-tighter">{streakStats.bestStreak} <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Days</span></div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-200 w-full grid grid-cols-1 gap-6">
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Daily Efficiency Avg</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-slate-900 tracking-tighter">
                      {Math.round(historyData.reduce((acc, curr) => acc + curr.total, 0) / (historyData.length || 1))}
                      <span className="text-lg text-slate-400 ml-1">ml</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-400 tracking-tighter">
                      / {((historyData.reduce((acc, curr) => acc + curr.total, 0) / (historyData.length || 1)) / 1000).toFixed(2)}
                      <span className="text-sm text-slate-500 ml-1">L</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      <nav className="fixed bottom-8 left-6 right-6 z-50">
        <div className="max-w-xs mx-auto bg-white/80 backdrop-blur-2xl border border-slate-200 rounded-[2rem] p-2 flex items-center justify-between shadow-2xl">
          <button 
            onClick={() => setActiveTab('today')}
            className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-[1.5rem] transition-all duration-300 ${activeTab === 'today' ? 'text-slate-900 bg-slate-50 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Droplets size={22} strokeWidth={activeTab === 'today' ? 2.5 : 2} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${activeTab === 'today' ? 'opacity-100' : 'opacity-60'}`}>Today</span>
          </button>
          <button 
            onClick={() => setActiveTab('trends')}
            className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-[1.5rem] transition-all duration-300 ${activeTab === 'trends' ? 'text-slate-900 bg-slate-50 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <History size={22} strokeWidth={activeTab === 'trends' ? 2.5 : 2} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${activeTab === 'trends' ? 'opacity-100' : 'opacity-60'}`}>Progress</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
