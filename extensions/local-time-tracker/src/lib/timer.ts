import { LaunchType, launchCommand } from "@raycast/api";
import { getDurationSeconds, isClockBeforeStart } from "./duration";
import { clearActiveTimerIfMatches, getActiveTimer, getWorkLogs, saveActiveTimer, upsertWorkLog } from "./storage";
import type { ActiveTimer, WorkLog } from "./types";
import { markMenuBarDisplayRefresh } from "./menu-bar-refresh";
import { endPomodoro, startPomodoroIntervalUnderLock, withReminderOperation } from "./reminder-service";

export class ActiveTimerExistsError extends Error {
  constructor(public readonly activeTimer: ActiveTimer) {
    super("An active timer already exists");
    this.name = "ActiveTimerExistsError";
  }
}

export async function startTimer(projectId: string, description: string, usePomodoro = false): Promise<ActiveTimer> {
  const timer = await withReminderOperation(async () => {
    const savedTimer = await saveNewTimer(projectId, description);
    if (usePomodoro) {
      try {
        await startPomodoroIntervalUnderLock(savedTimer.id);
      } catch (error) {
        // No background refresh or other writer has seen this new timer yet.
        await clearActiveTimerIfMatches(savedTimer.id);
        throw error;
      }
    }
    return savedTimer;
  });
  await refreshMenuBar();
  return timer;
}

async function saveNewTimer(projectId: string, description: string): Promise<ActiveTimer> {
  const currentTimer = await getActiveTimer();
  if (currentTimer) {
    throw new ActiveTimerExistsError(currentTimer);
  }

  const activeTimer: ActiveTimer = {
    id: crypto.randomUUID(),
    projectId,
    description: description.trim(),
    startedAt: new Date().toISOString(),
  };

  const timerBeforeSave = await getActiveTimer();
  if (timerBeforeSave) {
    throw new ActiveTimerExistsError(timerBeforeSave);
  }

  await saveActiveTimer(activeTimer);
  return activeTimer;
}

export async function updateTimerStart(
  timerId: string,
  expectedStartedAt: string,
  newStartedAt: Date,
): Promise<ActiveTimer> {
  const startedAtMs = newStartedAt.getTime();
  if (!Number.isFinite(startedAtMs)) throw new Error("Select a valid start date and time");
  const startedAt = newStartedAt.toISOString();

  const updated = await withReminderOperation(async () => {
    const current = await getActiveTimer();
    if (!current || current.id !== timerId) {
      throw new Error("The timer is no longer running. Reopen Start Work to load the current timer.");
    }
    if (current.startedAt !== expectedStartedAt) {
      throw new Error("The start time has changed. Reopen Start Work before editing it again.");
    }
    if ((await getWorkLogs()).some((log) => log.id === timerId)) {
      throw new Error("This timer already has a saved work log. Stop Work to finish recovery, then edit the work log.");
    }
    if (startedAtMs > Date.now()) throw new Error("Start time cannot be in the future");

    const next = { ...current, startedAt };
    await saveActiveTimer(next);
    return next;
  });
  // The refresh may check reminders immediately; release the shared lock first.
  await refreshMenuBar();
  return updated;
}

export type StopTimerResult =
  | { status: "none" }
  | { status: "clock-rollback" }
  | { status: "stopped" | "recovered"; workLog: WorkLog; durationSeconds: number };

export async function stopTimer(): Promise<StopTimerResult> {
  const result = await withReminderOperation(stopCurrentTimer);
  if (result.status === "stopped" || result.status === "recovered") {
    await cleanupPomodoro(result.workLog.id);
    await refreshMenuBar();
  }
  return result;
}

async function stopCurrentTimer(): Promise<StopTimerResult> {
  const activeTimer = await getActiveTimer();
  if (!activeTimer) {
    return { status: "none" };
  }

  const workLogs = await getWorkLogs();
  const existingLog = workLogs.find((workLog) => workLog.id === activeTimer.id);

  if (existingLog) {
    await clearActiveTimerIfMatches(activeTimer.id);
    return {
      status: "recovered",
      workLog: existingLog,
      durationSeconds: getDurationSeconds(existingLog.startedAt, existingLog.endedAt),
    };
  }

  const now = new Date();
  if (isClockBeforeStart(activeTimer.startedAt, now)) {
    // Keep the timer so a clock rollback cannot erase already tracked work.
    return { status: "clock-rollback" };
  }

  const stoppedAt = now.toISOString();
  const durationSeconds = getDurationSeconds(activeTimer.startedAt, stoppedAt);
  const workLog: WorkLog = {
    id: activeTimer.id,
    projectId: activeTimer.projectId,
    description: activeTimer.description,
    startedAt: activeTimer.startedAt,
    endedAt: stoppedAt,
    createdAt: stoppedAt,
    updatedAt: stoppedAt,
  };

  await upsertWorkLog(workLog);
  await clearActiveTimerIfMatches(activeTimer.id);
  return { status: "stopped", workLog, durationSeconds };
}

export async function refreshMenuBar({ displayOnly = false }: { displayOnly?: boolean } = {}): Promise<void> {
  try {
    if (displayOnly) await markMenuBarDisplayRefresh();
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch (error) {
    console.error("Failed to refresh menu bar", error);
  }
}

async function cleanupPomodoro(timerId: string): Promise<void> {
  try {
    await endPomodoro(timerId);
  } catch (error) {
    // Stale state is ignored by timer ID; cleanup must not prevent saving work.
    console.error("Failed to clear pomodoro state", error);
  }
}
