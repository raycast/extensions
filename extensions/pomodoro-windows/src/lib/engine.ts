/**
 * Pure Pomodoro state machine. No Raycast or Node APIs in here, so it is easy to test.
 *
 * Time is never "ticked": state stores timestamps, and everything (remaining time, whether an
 * interval has ended) is derived from `now`. That is what lets the timer survive Raycast unloading
 * the extension, sleep/hibernate, and background refreshes that run late.
 */

export type Phase = "focus" | "shortBreak" | "longBreak";
export type Status = "idle" | "running" | "paused" | "finished";

export interface AlarmRef {
  /** When the scheduled Windows alarm task will fire. */
  firesAt: number;
}

export interface TimerState {
  status: Status;
  /** Current phase; when `finished`, the phase that just ended. */
  phase: Phase;
  durationMs: number;
  /** Time accumulated before the current running segment (pauses split an interval into segments). */
  elapsedMs: number;
  /** Start of the current running segment. Only set while running. */
  runStartedAt?: number;
  /** When this interval was first started. */
  intervalStartedAt?: number;
  /** Focus intervals completed in the current cycle (toward the long break). */
  cycleCount: number;
  label?: string;
  alarm?: AlarmRef;
  /** The focus preset this timer runs with (lengths are snapshotted so editing a preset doesn't jolt a running timer). */
  preset?: PresetSnapshot;
}

export interface PresetSnapshot {
  id: string;
  name: string;
  icon: string;
  focusMs: number;
  shortBreakMs: number;
  longBreakMs: number;
  longBreakEvery: number;
}

export interface HistoryEntry {
  id: string;
  phase: Phase;
  label?: string;
  presetName?: string;
  startedAt: number;
  endedAt: number;
  plannedMs: number;
  actualMs: number;
  completed: boolean;
}

export interface EngineConfig {
  focusMs: number;
  shortBreakMs: number;
  longBreakMs: number;
  longBreakEvery: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}

export interface Completion {
  entry: HistoryEntry;
  next: Phase;
  autoStarted: boolean;
}

/** Partial focus shorter than this is not logged when stopped/skipped. */
export const MIN_LOGGED_MS = 60_000;

export const PHASE_NAMES: Record<Phase, string> = {
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

export function initialState(): TimerState {
  return { status: "idle", phase: "focus", durationMs: 0, elapsedMs: 0, cycleCount: 0 };
}

export function durationFor(phase: Phase, cfg: EngineConfig): number {
  if (phase === "focus") return cfg.focusMs;
  if (phase === "shortBreak") return cfg.shortBreakMs;
  return cfg.longBreakMs;
}

export function elapsedMs(state: TimerState, now: number): number {
  if (state.status === "running" && state.runStartedAt !== undefined) {
    return state.elapsedMs + Math.max(0, now - state.runStartedAt);
  }
  return state.elapsedMs;
}

export function remainingMs(state: TimerState, now: number): number {
  if (state.status === "idle" || state.status === "finished") return 0;
  return Math.max(0, state.durationMs - elapsedMs(state, now));
}

export function progress(state: TimerState, now: number): number {
  if (state.status === "finished") return 1;
  if (state.durationMs <= 0) return 0;
  return Math.min(1, elapsedMs(state, now) / state.durationMs);
}

/** When the running interval will end. */
export function endsAt(state: TimerState): number | undefined {
  if (state.status !== "running" || state.runStartedAt === undefined) return undefined;
  return state.runStartedAt + (state.durationMs - state.elapsedMs);
}

/** The break that follows a focus interval, given focus intervals already completed in the cycle. */
export function breakAfter(completedInCycle: number, cfg: EngineConfig): Phase {
  return completedInCycle > 0 && completedInCycle % cfg.longBreakEvery === 0 ? "longBreak" : "shortBreak";
}

/** The phase that comes after the current one. */
export function upcomingPhase(state: TimerState, cfg: EngineConfig): Phase {
  if (state.status === "idle") return "focus";
  if (state.phase !== "focus") return "focus";
  // A focus that just finished has already been counted; a running one has not.
  const counted = state.status === "finished" ? state.cycleCount : state.cycleCount + 1;
  return breakAfter(counted, cfg);
}

let idCounter = 0;
function makeId(at: number): string {
  idCounter = (idCounter + 1) % 1000;
  return `${at.toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function entryFor(state: TimerState, endedAt: number, completed: boolean): HistoryEntry {
  return {
    id: makeId(endedAt),
    phase: state.phase,
    label: state.label,
    presetName: state.preset?.name,
    startedAt: state.intervalStartedAt ?? endedAt - elapsedMs(state, endedAt),
    endedAt,
    plannedMs: state.durationMs,
    actualMs: Math.min(state.durationMs, elapsedMs(state, endedAt)),
    completed,
  };
}

/** Logs the interval in progress if it is worth logging (a focus of at least a minute). */
export function partialEntry(state: TimerState, now: number): HistoryEntry | undefined {
  if (state.status !== "running" && state.status !== "paused") return undefined;
  if (state.phase !== "focus") return undefined;
  if (elapsedMs(state, now) < MIN_LOGGED_MS) return undefined;
  return entryFor(state, now, false);
}

export function start(state: TimerState, phase: Phase, cfg: EngineConfig, now: number, label?: string): TimerState {
  return {
    status: "running",
    phase,
    durationMs: durationFor(phase, cfg),
    elapsedMs: 0,
    runStartedAt: now,
    intervalStartedAt: now,
    cycleCount: state.cycleCount,
    // Breaks keep the focus label so "what was I doing" survives the break.
    label: label !== undefined ? label || undefined : state.label,
    alarm: state.alarm,
    preset: state.preset,
  };
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== "running") return state;
  return { ...state, status: "paused", elapsedMs: elapsedMs(state, now), runStartedAt: undefined };
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.status !== "paused") return state;
  return { ...state, status: "running", runStartedAt: now };
}

export function restart(state: TimerState, now: number): TimerState {
  if (state.status !== "running" && state.status !== "paused") return state;
  return { ...state, status: "running", elapsedMs: 0, runStartedAt: now, intervalStartedAt: now };
}

export function stop(state: TimerState): TimerState {
  return {
    ...initialState(),
    cycleCount: state.cycleCount,
    label: state.label,
    alarm: state.alarm,
    preset: state.preset,
  };
}

export function resetCycle(state: TimerState): TimerState {
  return { ...state, cycleCount: 0 };
}

/** End the current interval early (not counted toward the cycle) and start the next one. */
export function skip(state: TimerState, cfg: EngineConfig, now: number): TimerState {
  if (state.status === "idle") return start(state, "focus", cfg, now);
  const next = upcomingPhase(state, cfg);
  let cycleCount = state.cycleCount;
  // Skipping a long break still closes the cycle.
  if (state.phase === "longBreak" && state.status !== "finished") cycleCount = 0;
  return start({ ...state, cycleCount }, next, cfg, now);
}

/**
 * Advances the state to `now`, finalizing any intervals that have ended and auto-starting the next
 * one when configured. Auto-started intervals begin exactly when the previous one ended, so a late
 * background refresh never loses time. Loops in case several intervals elapsed (e.g. after sleep).
 */
export function advance(
  state: TimerState,
  cfg: EngineConfig,
  now: number,
): { state: TimerState; completions: Completion[] } {
  const completions: Completion[] = [];
  let current = state;

  for (let guard = 0; guard < 50; guard++) {
    const end = endsAt(current);
    if (end === undefined || end > now) break;

    const entry = entryFor(current, end, true);
    let cycleCount = current.cycleCount;
    if (current.phase === "focus") cycleCount += 1;
    if (current.phase === "longBreak") cycleCount = 0;

    const finished: TimerState = {
      ...current,
      status: "finished",
      elapsedMs: current.durationMs,
      runStartedAt: undefined,
      cycleCount,
    };
    const next = upcomingPhase(finished, cfg);
    const auto = next === "focus" ? cfg.autoStartFocus : cfg.autoStartBreaks;

    completions.push({ entry, next, autoStarted: auto });
    current = auto ? start(finished, next, cfg, end) : finished;
  }

  return { state: current, completions };
}
