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
  if (await finish(timer, true)) return { running: null, finished: timer };
  // Someone else claimed it first (and reports it), or a newer timer has
  // replaced it in the meantime: report whatever is running now.
  const current = await getTimer();
  return { running: current && !isExpired(current) ? current : null };
}

/**
 * Close out a session: claim the timer, record it (breaks are not logged),
 * and append it to the daily note. Returns false when the timer could not be
 * claimed because another caller already finished it or a newer timer has
 * replaced it; nothing is written in that case.
 */
export async function finish(
  timer: TimerState,
  completed: boolean,
): Promise<boolean> {
  // clearTimer() removes only this instance, and only one caller succeeds.
  // That caller alone records the session, so concurrent settles (a menu bar
  // refresh, a second command) cannot log it twice or clear a newer timer.
  if (!(await clearTimer(timer.id))) return false;
  if (timer.isBreak) return true;

  const scheduledEnd = timer.startedAt + timer.duration;
  const log = {
    taskTitle: timer.taskTitle,
    subtaskTitle: timer.subtaskTitle,
    startedAt: timer.startedAt,
    endedAt: completed ? scheduledEnd : Math.min(Date.now(), scheduledEnd),
    completed,
  };
  // Second line of defence: addLog() dedupes on startedAt.
  if (await addLog(log)) {
    await createLogWriter().writeLog(log);
  }
  return true;
}

/**
 * Settle, then stop whatever is still running. Returns the timer that this
 * call stopped early, or null if nothing was running (or it was claimed by
 * someone else first).
 */
export async function stopRunning(): Promise<TimerState | null> {
  const { running } = await settle();
  if (!running) return null;
  return (await finish(running, false)) ? running : null;
}
