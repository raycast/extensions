export type TimerKind = "focus" | "break" | "long-break";

export type TimerState =
  | { status: "running"; kind: TimerKind; durationMs: number; endsAt: number }
  | { status: "paused"; kind: TimerKind; durationMs: number; remainingMs: number }
  | { status: "finished"; kind: TimerKind; durationMs: number };

const MINUTE = 60_000;

export const DURATIONS: Record<TimerKind, number> = {
  focus: 25 * MINUTE,
  break: 5 * MINUTE,
  "long-break": 15 * MINUTE,
};

export const KIND_LABEL: Record<TimerKind, string> = {
  focus: "Focus",
  break: "Break",
  "long-break": "Long Break",
};

export const MAX_CUSTOM_MINUTES = 180;

export function start(kind: TimerKind, durationMs: number, now: number): TimerState {
  return { status: "running", kind, durationMs, endsAt: now + durationMs };
}

/** Returns the paused state, or null when there is nothing running to pause. */
export function pause(state: TimerState | null, now: number): TimerState | null {
  if (!state || state.status !== "running") return null;
  const remainingMs = remaining(state, now);
  if (remainingMs <= 0) return null;
  return { status: "paused", kind: state.kind, durationMs: state.durationMs, remainingMs };
}

/** Returns the running state, or null when there is nothing paused to resume. */
export function resume(state: TimerState | null, now: number): TimerState | null {
  if (!state || state.status !== "paused") return null;
  return { status: "running", kind: state.kind, durationMs: state.durationMs, endsAt: now + state.remainingMs };
}

/** Returns a finished state when a running timer has passed its end, otherwise null. */
export function expire(state: TimerState | null, now: number): TimerState | null {
  if (!state || state.status !== "running" || state.endsAt > now) return null;
  return { status: "finished", kind: state.kind, durationMs: state.durationMs };
}

export function remaining(state: TimerState | null, now: number): number {
  if (!state) return 0;
  switch (state.status) {
    case "running":
      return Math.max(0, state.endsAt - now);
    case "paused":
      return state.remainingMs;
    case "finished":
      return 0;
  }
}

/** "mm:ss", rounding up so a timer with 0.5s left still reads 00:01. */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Parses the custom-focus argument. Returns minutes or an error message. */
export function parseMinutes(input: string): { minutes: number } | { error: string } {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return { error: "Enter a whole number of minutes" };
  const minutes = Number(trimmed);
  if (minutes < 1 || minutes > MAX_CUSTOM_MINUTES) {
    return { error: `Minutes must be between 1 and ${MAX_CUSTOM_MINUTES}` };
  }
  return { minutes };
}
