import { LocalStorage, environment } from "@raycast/api";
import { spawn } from "node:child_process";

import type { PomodoroSession } from "./pomodoro-machine";
import { shouldScheduleTimerElapsed } from "./pomodoro-machine";

const TIMER_SCHEDULER_KEY = "timer-scheduler-state";
const TIMER_ELAPSED_NOTIFIED_KEY = "timer-elapsed-notified-session-id";
const TIMER_ELAPSED_COMMAND = "timer-elapsed";

type TimerSchedulerState = {
  pid: number;
  sessionId: string;
  plannedEndAt: string;
};

function escapeShellArgument(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildCommandDeeplink(
  commandName: string,
  launchType: "background" | "userInitiated" = "background",
): string {
  return `raycast://extensions/${encodeURIComponent(
    environment.ownerOrAuthorName,
  )}/${encodeURIComponent(environment.extensionName)}/${encodeURIComponent(commandName)}?launchType=${launchType}`;
}

async function getTimerSchedulerState(): Promise<TimerSchedulerState | null> {
  const raw = await LocalStorage.getItem<string>(TIMER_SCHEDULER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TimerSchedulerState;
  } catch {
    await LocalStorage.removeItem(TIMER_SCHEDULER_KEY);
    return null;
  }
}

async function setTimerSchedulerState(state: TimerSchedulerState): Promise<void> {
  await LocalStorage.setItem(TIMER_SCHEDULER_KEY, JSON.stringify(state));
}

async function clearTimerSchedulerState(): Promise<void> {
  await LocalStorage.removeItem(TIMER_SCHEDULER_KEY);
}

export async function clearTimerElapsedNotification(): Promise<void> {
  await LocalStorage.removeItem(TIMER_ELAPSED_NOTIFIED_KEY);
}

export async function hasTimerElapsedBeenNotified(sessionId: string): Promise<boolean> {
  const notifiedSessionId = await LocalStorage.getItem<string>(TIMER_ELAPSED_NOTIFIED_KEY);
  return notifiedSessionId === sessionId;
}

export async function markTimerElapsedNotified(sessionId: string): Promise<void> {
  await LocalStorage.setItem(TIMER_ELAPSED_NOTIFIED_KEY, sessionId);
}

export async function cancelTimerScheduler(): Promise<void> {
  const state = await getTimerSchedulerState();
  if (!state) {
    return;
  }

  try {
    process.kill(-state.pid, "SIGTERM");
  } catch {
    try {
      process.kill(state.pid, "SIGTERM");
    } catch {
      // stale pid を無視
    }
  }

  await clearTimerSchedulerState();
}

async function scheduleTimerElapsed(session: PomodoroSession): Promise<void> {
  const delaySeconds = Math.max(0, Math.ceil((new Date(session.plannedEndAt).getTime() - Date.now()) / 1000));
  const deeplink = buildCommandDeeplink(TIMER_ELAPSED_COMMAND, "background");
  const command =
    delaySeconds > 0
      ? `sleep ${delaySeconds}; open ${escapeShellArgument(deeplink)}`
      : `open ${escapeShellArgument(deeplink)}`;

  const child = spawn("/bin/sh", ["-c", command], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  if (!child.pid) {
    return;
  }

  await setTimerSchedulerState({
    pid: child.pid,
    sessionId: session.id,
    plannedEndAt: session.plannedEndAt,
  });
}

export async function syncTimerScheduler(session: PomodoroSession | null): Promise<void> {
  if (!session || session.status !== "running") {
    await cancelTimerScheduler();
    await clearTimerElapsedNotification();
    return;
  }

  if (!shouldScheduleTimerElapsed(session)) {
    await cancelTimerScheduler();
    return;
  }

  const current = await getTimerSchedulerState();
  if (current && current.sessionId === session.id && current.plannedEndAt === session.plannedEndAt) {
    return;
  }

  await cancelTimerScheduler();
  await scheduleTimerElapsed(session);
}
