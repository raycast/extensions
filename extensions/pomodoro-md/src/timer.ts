import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import { SessionLock, assertHeld } from "./lock";

export interface TimerState {
  id: string; // Identifies this timer instance
  taskTitle: string;
  subtaskTitle?: string;
  startedAt: number; // Unix timestamp ms
  duration: number; // Duration in ms
  isBreak: boolean;
}

export interface PomodoroLog {
  id?: string; // TimerState.id of the session (absent in logs written before ids)
  taskTitle: string;
  subtaskTitle?: string;
  startedAt: number;
  endedAt: number;
  completed: boolean; // true = finished, false = stopped early
}

export interface TimerSpec {
  taskTitle: string;
  subtaskTitle?: string;
  durationMinutes: number;
  isBreak?: boolean;
}

const TIMER_KEY = "pomodoro-md-timer";
const LOG_KEY = "pomodoro-md-logs";

// Reads need no lock: they only observe. Every write below takes a
// SessionLock argument, so it can only be reached from inside
// withSessionLock() — see session.ts, the sole caller.

export async function getTimer(): Promise<TimerState | null> {
  const raw = await LocalStorage.getItem<string>(TIMER_KEY);
  if (!raw) return null;
  const state = JSON.parse(raw) as TimerState;
  // Timers stored before ids existed: derive a stable one so they can still
  // be finished and cleared.
  if (!state.id) state.id = `legacy-${state.startedAt}`;
  return state;
}

/** Build a timer that starts now. Pure; nothing is stored until saveTimer(). */
export function newTimer(spec: TimerSpec): TimerState {
  return {
    id: randomUUID(),
    taskTitle: spec.taskTitle,
    subtaskTitle: spec.subtaskTitle,
    startedAt: Date.now(),
    duration: spec.durationMinutes * 60 * 1000,
    isBreak: spec.isBreak ?? false,
  };
}

export async function saveTimer(
  lock: SessionLock,
  state: TimerState,
): Promise<void> {
  assertHeld(lock);
  await LocalStorage.setItem(TIMER_KEY, JSON.stringify(state));
}

export async function removeTimer(lock: SessionLock): Promise<void> {
  assertHeld(lock);
  await LocalStorage.removeItem(TIMER_KEY);
}

// Keep logs for 30 days so LocalStorage does not grow unbounded.
const LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Record a finished session. Returns false when it is already recorded, so
 * callers can skip downstream writes. Sessions are identified by timer id;
 * older entries without one fall back to the start time.
 */
export async function addLog(
  lock: SessionLock,
  entry: PomodoroLog,
): Promise<boolean> {
  assertHeld(lock);
  const cutoff = Date.now() - LOG_RETENTION_MS;
  const logs = (await getLogs()).filter((l) => l.endedAt >= cutoff);
  const same = (l: PomodoroLog) =>
    entry.id && l.id ? l.id === entry.id : l.startedAt === entry.startedAt;
  if (logs.some(same)) return false;
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
