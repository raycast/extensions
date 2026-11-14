import { LaunchType, launchCommand } from "@raycast/api";
import { getDurationSeconds, isClockBeforeStart } from "./duration";
import {
  clearActiveTimerIfMatches,
  getActiveTimer,
  getProjects,
  getWorkLogs,
  saveActiveTimer,
  savePlan,
  upsertWorkLog,
} from "./storage";
import type { ActiveTimer, PlanReference, WorkLog } from "./types";
import { getPlannedItem, planForDate, isPlanComplete, planMatches, setPlanCompleted } from "./planning";
import { requirePlan } from "./planning-service";
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

async function saveNewTimer(projectId: string, description: string, plan?: PlanReference): Promise<ActiveTimer> {
  const currentTimer = await getActiveTimer();
  if (currentTimer) {
    throw new ActiveTimerExistsError(currentTimer);
  }

  const activeTimer: ActiveTimer = {
    id: crypto.randomUUID(),
    projectId,
    description: description.trim(),
    ...(plan ? { plan } : {}),
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

export async function stopTimer(expectedTimerId?: string): Promise<StopTimerResult> {
  const result = await withReminderOperation(() => stopCurrentTimer(expectedTimerId));
  if (result.status === "stopped" || result.status === "recovered") {
    await cleanupPomodoro(result.workLog.id);
    await refreshMenuBar();
  }
  return result;
}

// Keep validation, switching, and completion serialized with all other timer writers.
export async function startPlannedTimer(
  reference: PlanReference,
  usePomodoro = false,
  expectedTimerId?: string | null,
  date?: string,
): Promise<ActiveTimer> {
  let stopped: StopTimerResult = { status: "none" };
  try {
    return await withReminderOperation(async () => {
      const goal = await requirePlan(reference.goalId);
      const visible = date ? planForDate(goal, date) : goal;
      if (!visible) throw new Error("The plan has changed. Reload Today's Plan.");
      const item = getPlannedItem(visible, reference);
      if (reference.taskId ? !!item.completedAt : isPlanComplete(goal))
        throw new Error("Reopen this task before starting it");
      if (!reference.taskId && goal.tasks.length) throw new Error("Select a subtask to start tracking");
      const project = (await getProjects()).find((entry) => entry.id === goal.projectId);
      if (!project?.isActive) throw new Error("Enable this plan's project before starting work");
      const current = await getActiveTimer();
      if (expectedTimerId !== undefined && (current?.id ?? null) !== expectedTimerId)
        throw new Error("The running timer has changed. Reload Today's Plan before switching tasks.");
      if (current && planMatches(current.plan, reference)) return current;
      stopped = await stopCurrentTimer();
      if (stopped.status === "clock-rollback")
        throw new Error("Clock changed. Correct your Mac clock before switching tasks. The timer is still running.");
      const timer = await saveNewTimer(goal.projectId, item.title, reference);
      if (usePomodoro) {
        try {
          await startPomodoroIntervalUnderLock(timer.id);
        } catch (error) {
          await clearActiveTimerIfMatches(timer.id);
          throw error;
        }
      }
      return timer;
    });
  } finally {
    await finishPlanOperation(stopped);
  }
}

export async function completePlannedItem(reference: PlanReference, completed: boolean, date?: string): Promise<void> {
  let stopped: StopTimerResult = { status: "none" };
  try {
    await withReminderOperation(async () => {
      const goal = await requirePlan(reference.goalId);
      const visible = date ? planForDate(goal, date) : goal;
      if (!visible) throw new Error("The plan has changed. Reload Today's Plan.");
      getPlannedItem(visible, reference);
      const current = await getActiveTimer();
      if (
        completed &&
        current?.plan?.goalId === goal.id &&
        (reference.taskId
          ? current.plan.taskId === reference.taskId
          : !current.plan.taskId || visible.tasks.some((task) => task.id === current.plan?.taskId))
      ) {
        stopped = await stopCurrentTimer();
        if (stopped.status === "clock-rollback")
          throw new Error(
            "Clock changed. Correct your Mac clock before completing this task. The timer is still running.",
          );
      }
      await savePlan(setPlanCompleted(goal, reference, completed, new Date(), date));
    });
  } finally {
    await finishPlanOperation(stopped);
  }
}

async function finishPlanOperation(stopped: StopTimerResult): Promise<void> {
  if (stopped.status === "stopped" || stopped.status === "recovered") await cleanupPomodoro(stopped.workLog.id);
  await refreshMenuBar();
}

async function stopCurrentTimer(expectedTimerId?: string): Promise<StopTimerResult> {
  const activeTimer = await getActiveTimer();
  if (!activeTimer) {
    return { status: "none" };
  }
  if (expectedTimerId && activeTimer.id !== expectedTimerId) {
    throw new Error("The running timer has changed. Reload the current timer before stopping it.");
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
    ...(activeTimer.plan ? { plan: activeTimer.plan } : {}),
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
