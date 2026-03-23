import fs from "fs";
import path from "path";
import { environment, LocalStorage } from "@raycast/api";
import { spawn } from "child_process";
import { formatLabel } from "./utils";

export type TimerStatus = "running" | "paused" | "done";
export type TimerType = "timer" | "stopwatch" | "pomodoro";
export type PomodoroPhase = "work" | "break";

export interface TimerEntry {
  id: string;
  type: TimerType;
  label: string;
  note: string;
  totalSeconds: number;
  remaining: number;
  elapsed: number;
  status: TimerStatus;
  soundFile: string;
  volume: number;
  lastTick: number;
  alertDuration: number;
  // pomodoro fields
  pomodoroPhase?: PomodoroPhase;
  pomodoroWorkSeconds?: number;
  pomodoroBreakSeconds?: number;
  pomodoroCycle?: number;
  pomodoroMaxCycles?: number; // 0 = infinite
}

export interface HistoryEntry {
  id: string;
  label: string;
  note: string;
  totalSeconds: number;
  dismissedAt: number;
  pomodoroBreakSeconds?: number;
  pomodoroMaxCycles?: number;
}

interface TimerState {
  timers: TimerEntry[];
  history: HistoryEntry[];
  daemonPid?: number;
  notificationsEnabled?: boolean;
}

const STATE_PATH = path.join(environment.supportPath, "timers.json");
const WORKER_PATH = path.join(environment.assetsPath, "timer-worker", "bin", "Release", "net10.0-windows", "win-x64", "publish", "timer-worker.exe");
const ASSETS_PATH = environment.assetsPath;
const RECENT_KEY = "recent-timers";
const MAX_RECENT = 3;
const MAX_HISTORY = 10;

export function readState(): TimerState {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    if (!raw.history) raw.history = [];
    return raw;
  } catch {
    return { timers: [], history: [] };
  }
}

export function writeState(state: TimerState): void {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function isDaemonRunning(pid?: number): boolean {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function ensureDaemon(): void {
  const state = readState();
  if (isDaemonRunning(state.daemonPid)) return;

  // Check if worker exists
  if (!require("fs").existsSync(WORKER_PATH)) {
    const { showHUD } = require("@raycast/api");
    showHUD("⚠️ Timer worker not found — please reinstall the extension");
    return;
  }

  const child = spawn(WORKER_PATH, [STATE_PATH, ASSETS_PATH], {
    detached: true, stdio: "pipe", windowsHide: false,
  });

  // Detect .NET Runtime missing
  child.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString();
    if (msg.includes("You must install") || msg.includes(".NET")) {
      const { showHUD, open } = require("@raycast/api");
      showHUD("⚠️ .NET Runtime required — click to download");
      open("https://aka.ms/dotnet/download");
    }
  });

  child.unref();
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function startTimer(params: {
  totalSeconds: number;
  label: string;
  note: string;
  soundFile: string;
  volume: number;
  alertDuration: number;
  // pomodoro fields
  pomodoroPhase?: PomodoroPhase;
  pomodoroWorkSeconds?: number;
  pomodoroBreakSeconds?: number;
  pomodoroCycle?: number;
  pomodoroMaxCycles?: number; // 0 = infinite
}): TimerEntry {
  const state = readState();
  const entry: TimerEntry = {
    id: generateId(),
    type: "timer",
    label: params.label,
    note: params.note,
    totalSeconds: params.totalSeconds,
    remaining: params.totalSeconds,
    elapsed: 0,
    status: "running",
    soundFile: params.soundFile,
    volume: params.volume,
    lastTick: Date.now(),
    alertDuration: params.alertDuration,
  };
  state.timers.push(entry);
  writeState(state);
  ensureDaemon();
  return entry;
}

export function startStopwatch(note = ""): TimerEntry {
  const state = readState();
  const entry: TimerEntry = {
    id: generateId(),
    type: "stopwatch",
    label: "Stopwatch",
    note,
    totalSeconds: 0,
    remaining: 0,
    elapsed: 0,
    status: "running",
    soundFile: "",
    volume: 0,
    lastTick: Date.now(),
    alertDuration: 0,
  };
  state.timers.push(entry);
  writeState(state);
  ensureDaemon();
  return entry;
}

export function startPomodoro(params: {
  workSeconds: number;
  breakSeconds: number;
  note: string;
  soundFile: string;
  volume: number;
  alertDuration: number;
  maxCycles: number;
}): TimerEntry {
  const state = readState();
  // For pomodoro, if alertDuration is 0 (until dismissed), use 5s so phases auto-advance
  const pomAlertDuration = params.alertDuration === 0 ? 5 : params.alertDuration;
  const entry: TimerEntry = {
    id: generateId(),
    type: "pomodoro",
    label: `Pomodoro`,
    note: params.note,
    totalSeconds: params.workSeconds,
    remaining: params.workSeconds,
    elapsed: 0,
    status: "running",
    soundFile: params.soundFile,
    volume: params.volume,
    lastTick: Date.now(),
    alertDuration: pomAlertDuration,
    pomodoroPhase: "work",
    pomodoroWorkSeconds: params.workSeconds,
    pomodoroBreakSeconds: params.breakSeconds,
    pomodoroCycle: 1,
    pomodoroMaxCycles: params.maxCycles,
  };
  state.timers.push(entry);
  writeState(state);
  ensureDaemon();
  return entry;
}

export function pauseTimer(id: string): void {
  const state = readState();
  const t = state.timers.find(t => t.id === id);
  if (t && t.status === "running") { t.status = "paused"; writeState(state); }
}

export function resumeTimer(id: string): void {
  const state = readState();
  const t = state.timers.find(t => t.id === id);
  if (t && t.status === "paused") {
    t.status = "running";
    t.lastTick = Date.now();
    writeState(state);
    ensureDaemon();
  }
}

export function cancelTimer(id: string): void {
  const state = readState();
  state.timers = state.timers.filter(t => t.id !== id);
  writeState(state);
}

export async function dismissTimer(id: string): Promise<void> {
  const state = readState();
  const t = state.timers.find(t => t.id === id);

  if (t) {
    // Save to recent (for pomodoro save workSeconds, for stopwatch skip)
    if (t.type !== "stopwatch") {
      const recentSeconds = t.type === "pomodoro" ? (t.pomodoroWorkSeconds ?? t.totalSeconds) : t.totalSeconds;
      const raw = await LocalStorage.getItem<string>(RECENT_KEY);
      const existing: number[] = raw ? JSON.parse(raw) : [];
      const updated = [recentSeconds, ...existing.filter(s => s !== recentSeconds)].slice(0, MAX_RECENT);
      await LocalStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    }

    // Save to history with proper label
    const label = t.type === "pomodoro"
      ? `Pomodoro ${formatLabel(t.pomodoroWorkSeconds ?? 0)}+${formatLabel(t.pomodoroBreakSeconds ?? 0)} · ${t.pomodoroCycle ?? 1}${(t.pomodoroMaxCycles ?? 0) > 0 ? `/${t.pomodoroMaxCycles}` : ""} cycles`
      : t.label;
    const historyEntry: HistoryEntry = {
      id: t.id,
      label,
      note: t.note,
      totalSeconds: t.type === "pomodoro" ? (t.pomodoroWorkSeconds ?? t.totalSeconds) : t.totalSeconds,
      dismissedAt: Date.now(),
      ...(t.type === "pomodoro" ? { pomodoroBreakSeconds: t.pomodoroBreakSeconds, pomodoroMaxCycles: t.pomodoroMaxCycles } : {}),
    };
    state.history = [historyEntry, ...state.history].slice(0, MAX_HISTORY);
  }

  state.timers = state.timers.filter(t => t.id !== id);
  writeState(state);
}

export function clearHistory(): void {
  const state = readState();
  state.history = [];
  writeState(state);
}

export function getActiveTimers(): TimerEntry[] {
  return readState().timers.filter(t => t.status === "running" || t.status === "paused");
}

export function getDoneTimers(): TimerEntry[] {
  return readState().timers.filter(t => t.status === "done");
}

export function getHistory(): HistoryEntry[] {
  return readState().history;
}

export function setNotificationsInState(enabled: boolean): void {
  const state = readState();
  state.notificationsEnabled = enabled;
  writeState(state);
}

export function updateTimerSound(id: string, soundFile: string, volume: number): void {
  const state = readState();
  const t = state.timers.find(t => t.id === id);
  if (t) { t.soundFile = soundFile; t.volume = volume; writeState(state); }
}

export function killAllTimers(): void {
  const state = readState();

  // Kill worker process
  if (state.daemonPid) {
    try { process.kill(state.daemonPid, 0); process.kill(state.daemonPid); } catch { /* ignore */ }
  }

  state.timers = [];
  state.daemonPid = 0;
  writeState(state);
}
