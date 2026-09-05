import { LocalStorage } from "@raycast/api";

export const STORAGE_KEY = "punch-clock-state";

export interface TimerState {
  /** Total working time in minutes, as entered by the user (excludes break). */
  totalMinutes: number;
  /** Break length in minutes, as entered by the user. */
  breakMinutes: number;
  /** Epoch ms when the timer was started. */
  startTime: number;
  /** Epoch ms when the timer is expected to expire (start + total + break). */
  endTime: number;
  /** Epoch ms when the timer was stopped, or null if it is still running/expired. */
  stoppedTime: number | null;
  /** Whether the timer is currently running. */
  running: boolean;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeState(value: unknown): TimerState | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Record<string, unknown>;

  if (
    !isFiniteNumber(candidate.totalMinutes) ||
    !isFiniteNumber(candidate.breakMinutes) ||
    !isFiniteNumber(candidate.startTime) ||
    !isFiniteNumber(candidate.endTime)
  ) {
    return undefined;
  }

  const stoppedTime =
    candidate.stoppedTime === null ? null : isFiniteNumber(candidate.stoppedTime) ? candidate.stoppedTime : undefined;
  // stoppedTime must be either null or a finite number; anything else (e.g.
  // a stringified value from corrupted storage) makes the state untrustworthy.
  if (stoppedTime === undefined && candidate.stoppedTime !== undefined) return undefined;

  if (typeof candidate.running !== "boolean") return undefined;

  return {
    totalMinutes: candidate.totalMinutes,
    breakMinutes: candidate.breakMinutes,
    startTime: candidate.startTime,
    endTime: candidate.endTime,
    stoppedTime: stoppedTime ?? null,
    running: candidate.running,
  };
}

export async function getState(): Promise<TimerState | undefined> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await clearState();
    return undefined;
  }
  const state = normalizeState(parsed);
  if (!state) {
    // Corrupted/outdated state; clear it so we don't keep tripping over it.
    await clearState();
    return undefined;
  }
  return state;
}

export async function setState(state: TimerState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function clearState(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

export async function startTimer(totalMinutes: number, breakMinutes: number): Promise<TimerState> {
  const startTime = Date.now();
  const endTime = startTime + (totalMinutes + breakMinutes) * 60_000;
  const state: TimerState = {
    totalMinutes,
    breakMinutes,
    startTime,
    endTime,
    stoppedTime: null,
    running: true,
  };
  await setState(state);
  return state;
}

export async function stopTimer(state: TimerState): Promise<TimerState> {
  const updated: TimerState = { ...state, running: false, stoppedTime: Date.now() };
  await setState(updated);
  return updated;
}

export async function resumeTimer(state: TimerState): Promise<TimerState> {
  // Shift the end time forward by however long the timer was paused, so the
  // remaining working time stays correct.
  const pausedFor = state.stoppedTime ? Date.now() - state.stoppedTime : 0;
  const updated: TimerState = {
    ...state,
    endTime: state.endTime + pausedFor,
    stoppedTime: null,
    running: true,
  };
  await setState(updated);
  return updated;
}

/** Remaining milliseconds until the timer expires. Can be negative once expired. */
export function getRemainingMs(state: TimerState, now: number = Date.now()): number {
  const reference = state.running ? now : (state.stoppedTime ?? now);
  return state.endTime - reference;
}

export function formatClock(date: number | Date): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Formats a duration (ms) as H:MM:SS, or -H:MM:SS if negative. */
export function formatDuration(ms: number): string {
  const abs = ms >= 0 ? Math.ceil(ms / 1000) : Math.floor(-ms / 1000);
  const negative = ms < 0 && abs > 0;
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = abs % 60;
  const text = `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return negative ? `-${text}` : text;
}

/** Formats a duration (ms) as e.g. "1h 30m", used for input summaries. */
export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
