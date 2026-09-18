import {
  TimerState,
  TimerSpec,
  getTimer,
  newTimer,
  saveTimer,
  removeTimer,
  addLog,
  isExpired,
} from "./timer";
import { SessionLock, withSessionLock } from "./lock";
import { createLogWriter } from "./log-writer";

// Every change to the stored timer goes through this module, inside one
// session lock (see lock.ts). A command therefore never observes a timer
// mid-update, two commands cannot both finish the same session, and a
// command holding a stale timer cannot clear a newer one.
//
// Callers must handle `status: "busy"`: another command held the lock for the
// whole wait, nothing was written, and the user should be told to retry.

export type CompletedType = "pomodoro" | "break";

// Launch context handed to start-timer when a session has just ended. The
// task to resume is not carried here; it is read back from the last log.
export interface CompletionContext {
  completedType: CompletedType;
}

export function completedTypeOf(timer: TimerState): CompletedType {
  return timer.isBreak ? "break" : "pomodoro";
}

export interface Busy {
  status: "busy";
}

export interface Settled {
  status: "ok";
  running: TimerState | null;
  finished?: TimerState; // Expired session that was just closed out
}

/**
 * Bring stored timer state up to date. A timer that has run past its
 * duration is treated as finished: it is logged and cleared here, so no
 * command ever sees an "expired but still running" timer.
 */
export async function settle(): Promise<Settled | Busy> {
  const result = await withSessionLock(settleLocked);
  return result.acquired ? result.value : { status: "busy" };
}

export interface StartOptions {
  /**
   * Start only if the stored timer is still this one (null = only if there
   * is none). Use it when the decision to start was made outside the lock,
   * e.g. after a confirmation dialog, so a timer that changed in the meantime
   * is never overwritten unrecorded.
   */
  expectCurrentId?: string | null;
}

export type Started =
  | { status: "ok"; timer: TimerState }
  | { status: "changed"; running: TimerState | null }
  | Busy;

/**
 * Finish whatever is stored (an expired timer is logged as completed, a
 * running pomodoro as stopped early, a running break is dropped), then start
 * `spec` — all under one lock, so nothing can slip in between.
 */
export async function startSession(
  spec: TimerSpec,
  options: StartOptions = {},
): Promise<Started> {
  const result = await withSessionLock(async (lock) => {
    const current = await getTimer();
    if (options.expectCurrentId !== undefined) {
      const currentId = current?.id ?? null;
      if (currentId !== options.expectCurrentId) {
        return {
          status: "changed",
          running: current && !isExpired(current) ? current : null,
        } as Started;
      }
    }
    if (current) await finishLocked(lock, current, isExpired(current));
    const timer = newTimer(spec);
    await saveTimer(lock, timer);
    return { status: "ok", timer } as Started;
  });
  return result.acquired ? result.value : { status: "busy" };
}

export type Stopped =
  | { status: "ok"; stopped: TimerState | null; finished?: TimerState }
  | Busy;

/**
 * Stop the stored timer. Returns the timer this call stopped early, or
 * `finished` when it had already run out (and was logged as completed).
 */
export async function stopSession(): Promise<Stopped> {
  const result = await withSessionLock(async (lock) => {
    const current = await getTimer();
    if (!current) return { status: "ok", stopped: null } as Stopped;
    if (isExpired(current)) {
      await finishLocked(lock, current, true);
      return { status: "ok", stopped: null, finished: current } as Stopped;
    }
    await finishLocked(lock, current, false);
    return { status: "ok", stopped: current } as Stopped;
  });
  return result.acquired ? result.value : { status: "busy" };
}

async function settleLocked(lock: SessionLock): Promise<Settled> {
  const timer = await getTimer();
  if (!timer) return { status: "ok", running: null };
  if (!isExpired(timer)) return { status: "ok", running: timer };
  await finishLocked(lock, timer, true);
  return { status: "ok", running: null, finished: timer };
}

/**
 * Close out the stored session: clear it, record it (breaks are not logged),
 * and append it to the daily note. The caller holds the lock and has just
 * read `timer`, so it is still the stored one.
 */
async function finishLocked(
  lock: SessionLock,
  timer: TimerState,
  completed: boolean,
): Promise<void> {
  await removeTimer(lock);
  if (timer.isBreak) return;

  const scheduledEnd = timer.startedAt + timer.duration;
  const log = {
    id: timer.id,
    taskTitle: timer.taskTitle,
    subtaskTitle: timer.subtaskTitle,
    startedAt: timer.startedAt,
    endedAt: completed ? scheduledEnd : Math.min(Date.now(), scheduledEnd),
    completed,
  };
  // addLog() dedupes on the timer id, so a session is never appended to the
  // note twice even if it is finished again from an older reading.
  if (await addLog(lock, log)) {
    await createLogWriter().writeLog(lock, log);
  }
}
