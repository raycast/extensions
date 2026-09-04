import { LocalStorage } from "@raycast/api";

export interface TimerState {
  taskTitle: string;
  subtaskTitle?: string;
  startedAt: number; // Unix timestamp ms
  duration: number; // Duration in ms
  isBreak: boolean;
}

export interface PomodoroLog {
  taskTitle: string;
  subtaskTitle?: string;
  startedAt: number;
  endedAt: number;
  completed: boolean; // true = finished, false = stopped early
}

const TIMER_KEY = "pomodoro-md-timer";
const LOG_KEY = "pomodoro-md-logs";

export async function getTimer(): Promise<TimerState | null> {
  const raw = await LocalStorage.getItem<string>(TIMER_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function startTimer(
  taskTitle: string,
  durationMinutes: number,
  subtaskTitle?: string,
  isBreak = false,
): Promise<void> {
  const state: TimerState = {
    taskTitle,
    subtaskTitle,
    startedAt: Date.now(),
    duration: durationMinutes * 60 * 1000,
    isBreak,
  };
  await LocalStorage.setItem(TIMER_KEY, JSON.stringify(state));
}

export async function startBreak(durationMinutes: number): Promise<void> {
  await startTimer("Break", durationMinutes, undefined, true);
}

export async function clearTimer(): Promise<void> {
  await LocalStorage.removeItem(TIMER_KEY);
}

// Keep logs for 30 days so LocalStorage does not grow unbounded.
const LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Record a finished session. Returns false when a session with the same
 * start time is already recorded, so callers can skip downstream writes.
 */
export async function addLog(entry: PomodoroLog): Promise<boolean> {
  const cutoff = Date.now() - LOG_RETENTION_MS;
  const logs = (await getLogs()).filter((l) => l.endedAt >= cutoff);
  if (logs.some((l) => l.startedAt === entry.startedAt)) return false;
  logs.push(entry);
  await LocalStorage.setItem(LOG_KEY, JSON.stringify(logs));
  return true;
}

export async function getLogs(): Promise<PomodoroLog[]> {
  const raw = await LocalStorage.getItem<string>(LOG_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function getTodayLogs(): Promise<PomodoroLog[]> {
  const logs = await getLogs();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  // Filter on endedAt so a session crossing midnight still lands in the
  // note of the day it finished instead of being lost.
  return logs.filter((l) => l.endedAt >= todayStart.getTime());
}

/**
 * The most recent pomodoro logged today, i.e. the task to offer when the
 * user wants to resume after a break or a completed session.
 */
export async function getLastLog(): Promise<PomodoroLog | null> {
  const logs = await getTodayLogs();
  return logs.length > 0 ? logs[logs.length - 1] : null;
}

export function getRemainingMs(state: TimerState): number {
  const elapsed = Date.now() - state.startedAt;
  return Math.max(0, state.duration - elapsed);
}

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function isExpired(state: TimerState): boolean {
  return Date.now() - state.startedAt >= state.duration;
}

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
