import { LaunchType, launchCommand } from "@raycast/api";
import { getDurationSeconds } from "./duration";
import { clearActiveTimerIfMatches, getActiveTimer, getWorkLogs, saveActiveTimer, upsertWorkLog } from "./storage";
import type { ActiveTimer, WorkLog } from "./types";

export class ActiveTimerExistsError extends Error {
  constructor(public readonly activeTimer: ActiveTimer) {
    super("An active timer already exists");
    this.name = "ActiveTimerExistsError";
  }
}

export async function startTimer(projectId: string, description: string): Promise<ActiveTimer> {
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
  await refreshMenuBar();
  return activeTimer;
}

export type StopTimerResult =
  { status: "none" } | { status: "stopped" | "recovered"; workLog: WorkLog; durationSeconds: number };

export async function stopTimer(): Promise<StopTimerResult> {
  const activeTimer = await getActiveTimer();
  if (!activeTimer) {
    return { status: "none" };
  }

  const workLogs = await getWorkLogs();
  const existingLog = workLogs.find((workLog) => workLog.id === activeTimer.id);

  if (existingLog) {
    await clearActiveTimerIfMatches(activeTimer.id);
    await refreshMenuBar();
    return {
      status: "recovered",
      workLog: existingLog,
      durationSeconds: getDurationSeconds(existingLog.startedAt, existingLog.endedAt),
    };
  }

  const stoppedAt = new Date().toISOString();
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
  await refreshMenuBar();
  return { status: "stopped", workLog, durationSeconds };
}

export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch (error) {
    console.error("Failed to refresh menu bar", error);
  }
}
