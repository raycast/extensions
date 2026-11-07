import { notify } from "./notify";
import { playSound } from "./sound";
import { clearState, loadState, saveState } from "./store";
import { expire, KIND_LABEL, pause, resume, start, TimerKind, TimerState } from "./timer";

/** Starts (or replaces) the timer. Plays the toggle sound. */
export async function startTimer(kind: TimerKind, durationMs: number): Promise<TimerState> {
  const state = start(kind, durationMs, Date.now());
  await saveState(state);
  await playSound("toggle");
  return state;
}

/** Pauses the running timer. Returns null (no sound) when nothing is running. */
export async function pauseTimer(): Promise<TimerState | null> {
  const next = pause(await loadState(), Date.now());
  if (!next) return null;
  await saveState(next);
  await playSound("toggle");
  return next;
}

/** Resumes the paused timer. Returns null (no sound) when nothing is paused. */
export async function resumeTimer(): Promise<TimerState | null> {
  const next = resume(await loadState(), Date.now());
  if (!next) return null;
  await saveState(next);
  await playSound("toggle");
  return next;
}

export async function clearTimer(): Promise<void> {
  await clearState();
}

/**
 * If the running timer has reached its end, marks it finished, notifies and plays the
 * done sound. Saving before notifying keeps delivery idempotent when the background
 * check and the pomo view race each other.
 */
export async function settleExpired(): Promise<TimerState | null> {
  const state = await loadState();
  const finished = expire(state, Date.now());
  if (!finished) return state;
  await saveState(finished);
  const label = KIND_LABEL[finished.kind];
  const body = finished.kind === "focus" ? "Time for a break." : "Back to focus.";
  await Promise.all([notify(`${label} finished`, body), playSound("done")]);
  return finished;
}
