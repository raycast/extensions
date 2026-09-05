import { TimerState, getTimer, clearTimer, addLog, isExpired } from "./timer";
import { createLogWriter } from "./log-writer";

export interface SettledTimer {
  running: TimerState | null;
  finished?: TimerState; // Expired session that was just closed out
}

export type CompletedType = "pomodoro" | "break";

// Launch context handed to start-timer when a session has just ended. The
// task to resume is not carried here; it is read back from the last log.
export interface CompletionContext {
  completedType: CompletedType;
}

export function completedTypeOf(timer: TimerState): CompletedType {
  return timer.isBreak ? "break" : "pomodoro";
}

/**
 * Bring stored timer state up to date. A timer that has run past its
 * duration is treated as finished: it is logged and cleared here, so no
 * command ever sees an "expired but still running" timer.
 */
export async function settle(): Promise<SettledTimer> {
  const timer = await getTimer();
  if (!timer) return { running: null };
  if (!isExpired(timer)) return { running: timer };
  await finish(timer, true);
  return { running: null, finished: timer };
}

/**
 * Close out a session: clear the timer, record it (breaks are not logged),
 * and append it to the daily note.
 */
export async function finish(
  timer: TimerState,
  completed: boolean,
): Promise<void> {
  // Clear first, so another caller settling at the same moment (a menu bar
  // refresh, a second command) finds nothing left to finish.
  await clearTimer();
  if (timer.isBreak) return;

  const scheduledEnd = timer.startedAt + timer.duration;
  const log = {
    taskTitle: timer.taskTitle,
    subtaskTitle: timer.subtaskTitle,
    startedAt: timer.startedAt,
    endedAt: completed ? scheduledEnd : Math.min(Date.now(), scheduledEnd),
    completed,
  };
  // addLog() dedupes on startedAt; skip the note when the session was
  // already recorded by a concurrent caller.
  if (await addLog(log)) {
    await createLogWriter().writeLog(log);
  }
}

/**
 * Settle, then stop whatever is still running. Returns the timer that was
 * stopped early, or null if nothing was running.
 */
export async function stopRunning(): Promise<TimerState | null> {
  const { running } = await settle();
  if (running) await finish(running, false);
  return running;
}
