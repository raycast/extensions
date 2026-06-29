import { LocalStorage } from "@raycast/api";

export type PomodoroPhase = "work" | "short_break" | "long_break" | "idle";

export interface PersistedPomodoroState {
  phase: PomodoroPhase;
  endsAt: number | null;
  isRunning: boolean;
  sessionCount: number;
  startedAt: string | null;
  linkedTaskId?: string;
  linkedTaskProjectId?: string;
  linkedTaskTitle?: string;
  ticktickSynced: boolean;
  workDurationSec: number;
  shortBreakSec: number;
  longBreakSec: number;
  pausedRemaining: number | null;
}

const STORAGE_KEY = "ticktick_pomodoro_state";

export const DEFAULT_DURATIONS = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

export function defaultPomodoroState(): PersistedPomodoroState {
  return {
    phase: "idle",
    endsAt: null,
    isRunning: false,
    sessionCount: 0,
    startedAt: null,
    ticktickSynced: false,
    workDurationSec: DEFAULT_DURATIONS.work,
    shortBreakSec: DEFAULT_DURATIONS.short_break,
    longBreakSec: DEFAULT_DURATIONS.long_break,
    pausedRemaining: null,
  };
}

export async function loadPomodoroState(): Promise<PersistedPomodoroState> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return defaultPomodoroState();
  try {
    return { ...defaultPomodoroState(), ...(JSON.parse(raw) as PersistedPomodoroState) };
  } catch {
    return defaultPomodoroState();
  }
}

export async function savePomodoroState(state: PersistedPomodoroState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function clearPomodoroState(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

export function durationForPhase(state: PersistedPomodoroState, phase: PomodoroPhase): number {
  if (phase === "work") return state.workDurationSec;
  if (phase === "short_break") return state.shortBreakSec;
  if (phase === "long_break") return state.longBreakSec;
  return state.workDurationSec;
}

/** Compute remaining seconds from persisted state (works across Raycast sessions). */
export function getRemainingSeconds(state: PersistedPomodoroState, now = Date.now()): number {
  if (state.phase === "idle") return state.workDurationSec;
  if (!state.isRunning) {
    return state.pausedRemaining ?? durationForPhase(state, state.phase);
  }
  if (!state.endsAt) return durationForPhase(state, state.phase);
  return Math.max(0, Math.ceil((state.endsAt - now) / 1000));
}

export function getElapsedSeconds(state: PersistedPomodoroState, now = Date.now()): number {
  const total = durationForPhase(state, state.phase);
  return total - getRemainingSeconds(state, now);
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
