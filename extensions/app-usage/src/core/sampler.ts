import type { AppRef, DaySlice, SamplerState } from "./types";

export interface TickOptions {
  /** Elapsed time beyond this is treated as a gap and clamped. */
  maxGapMs: number;
}

export interface TickResult {
  /** Time to record, or null when this window is not attributable at all. */
  slice: DaySlice | null;
  /** State to persist for the next tick. */
  nextState: SamplerState;
}

/**
 * One sampling step.
 *
 * Pure on purpose: the frontmost app and the idle reading are passed in, so the
 * whole accuracy story can be tested without a Raycast runtime or an OS call.
 *
 * Time is attributed to the app seen at the *previous* tick, since that is the
 * app we know was focused when the window opened.
 */
export function tick(
  now: number,
  current: AppRef | null,
  idleSeconds: number,
  state: SamplerState | null,
  opts: TickOptions,
): TickResult {
  const nextState: SamplerState = {
    v: 1,
    lastAt: now,
    lastKey: current?.key ?? "",
    lastName: current?.name ?? "",
  };

  // First ever run, or the previous tick saw nothing we are allowed to record.
  // Excluded applications land here, and must leave nothing behind at all: not
  // their active time and not the idle time that sat alongside it, since an
  // unexplained block of idle would betray that something was running.
  if (!state || state.lastKey === "") {
    return { slice: null, nextState };
  }

  const rawElapsed = now - state.lastAt;
  // Clock went backwards, or two ticks landed on the same millisecond.
  if (rawElapsed <= 0) {
    return { slice: null, nextState };
  }

  // Clamp before subtracting idle. Waking from sleep resets idle to near zero
  // while elapsed can be hours, so idle subtraction alone would not catch it.
  const elapsedMs = Math.min(rawElapsed, opts.maxGapMs);

  // HIDIdleTime measures idleness ending at `now`, so whatever is left after
  // removing it is the part of the window the user was actually active for.
  // This handles a user who wandered off partway through, not just one who was
  // away for the whole window.
  const idleMs = Math.min(Math.max(0, idleSeconds) * 1000, elapsedMs);
  const activeMs = elapsedMs - idleMs;

  const activeSeconds = Math.round(activeMs / 1000);
  const idleWindowSeconds = Math.round(idleMs / 1000);

  // Nothing worth a write: a sub-second window, or arithmetic that cancelled out.
  if (activeSeconds <= 0 && idleWindowSeconds <= 0) {
    return { slice: null, nextState };
  }

  return {
    slice: {
      at: state.lastAt,
      app: activeSeconds > 0 ? { key: state.lastKey, name: state.lastName, seconds: activeSeconds } : null,
      idleSeconds: idleWindowSeconds,
    },
    nextState,
  };
}
