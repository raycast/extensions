import { LocalStorage } from "@raycast/api";

const TIMER_KEY = "active-timer";

export interface TimerData {
  issueKey: string;
  issueSummary: string;
  startTime: string; // ISO string
  paused: boolean;
  totalPauseMs: number;
  pauseStart: string | null; // ISO string or null
}

export async function getActiveTimer(): Promise<TimerData | null> {
  const raw = await LocalStorage.getItem<string>(TIMER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TimerData;
  } catch {
    return null;
  }
}

export async function startTimer(
  issueKey: string,
  issueSummary: string,
): Promise<void> {
  const data: TimerData = {
    issueKey,
    issueSummary,
    startTime: new Date().toISOString(),
    paused: false,
    totalPauseMs: 0,
    pauseStart: null,
  };
  await LocalStorage.setItem(TIMER_KEY, JSON.stringify(data));
}

export async function pauseTimer(): Promise<void> {
  const timer = await getActiveTimer();
  if (!timer || timer.paused) return;
  timer.paused = true;
  timer.pauseStart = new Date().toISOString();
  await LocalStorage.setItem(TIMER_KEY, JSON.stringify(timer));
}

export async function resumeTimer(): Promise<void> {
  const timer = await getActiveTimer();
  if (!timer || !timer.paused || !timer.pauseStart) return;
  const pauseDuration = Date.now() - new Date(timer.pauseStart).getTime();
  timer.totalPauseMs += pauseDuration;
  timer.paused = false;
  timer.pauseStart = null;
  await LocalStorage.setItem(TIMER_KEY, JSON.stringify(timer));
}

export async function clearTimer(): Promise<void> {
  await LocalStorage.removeItem(TIMER_KEY);
}

export function getElapsedMs(timer: TimerData): number {
  const start = new Date(timer.startTime).getTime();
  const now = Date.now();
  if (timer.paused && timer.pauseStart) {
    const pauseStart = new Date(timer.pauseStart).getTime();
    return pauseStart - start - timer.totalPauseMs;
  }
  return now - start - timer.totalPauseMs;
}

export function getElapsedSeconds(timer: TimerData): number {
  return Math.floor(getElapsedMs(timer) / 1000);
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatDurationShort(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Round up to next 10-minute block, minimum 10 minutes.
 * Matches the Go app's rounding logic.
 */
export function roundUpToMinutes(seconds: number): number {
  if (seconds <= 0) return 10 * 60;
  const minutes = Math.ceil(seconds / 60);
  const rounded = Math.ceil(minutes / 10) * 10;
  return rounded * 60;
}

export function parseTimeInput(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  let totalMinutes = 0;
  const hourMatch = trimmed.match(/(\d+)\s*h/);
  const minMatch = trimmed.match(/(\d+)\s*m/);

  if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
  if (minMatch) totalMinutes += parseInt(minMatch[1]);

  if (!hourMatch && !minMatch) {
    const num = parseInt(trimmed);
    if (isNaN(num)) return null;
    totalMinutes = num;
  }

  return totalMinutes > 0 ? totalMinutes * 60 : null;
}
