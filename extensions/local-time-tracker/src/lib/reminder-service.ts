import {
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { withReminderLock } from "./reminder-lock";
import {
  deliverReminders,
  dueReminders,
  isIntervalFinished,
  isPomodoroState,
  newInterval,
  notificationKey,
  positiveInteger,
  type PomodoroState,
  type ReminderSettings,
} from "./reminders";
import { getActiveTimer, StorageDataError } from "./storage";
import type { ActiveTimer, WorkLog } from "./types";
import { getStartOfToday } from "./date";

const POMODORO_KEY = "pomodoroState";

async function locked<T>(action: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  return withReminderLock(join(environment.supportPath, "reminder-operation.lock"), action);
}

export function getReminderSettings(): ReminderSettings {
  const values = getPreferenceValues<Record<string, unknown>>();
  return {
    pomodoroEnabled: values.pomodoroEnabled !== false,
    dailyAlertEnabled: values.dailyAlertEnabled === true,
    dailyAlertMinutes: positiveInteger(values.dailyAlertMinutes, 480),
    timerAlertEnabled: values.timerAlertEnabled === true,
    timerAlertMinutes: positiveInteger(values.timerAlertMinutes, 480),
    workMinutes: positiveInteger(values.workMinutes, 25),
    shortBreakMinutes: positiveInteger(values.shortBreakMinutes, 5),
    longBreakMinutes: positiveInteger(values.longBreakMinutes, 15),
    longBreakEvery: positiveInteger(values.longBreakEvery, 4),
  };
}

export async function getPomodoro(timer: ActiveTimer | null): Promise<PomodoroState | null> {
  const raw = await LocalStorage.getItem<string>(POMODORO_KEY);
  if (raw === undefined) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new StorageDataError("Saved pomodoro data is invalid. Existing data was not overwritten.");
  }
  if (!isPomodoroState(value)) {
    throw new StorageDataError("Saved pomodoro data is invalid. Existing data was not overwritten.");
  }
  return value.timerId === timer?.id ? value : null;
}

export async function startPomodoroInterval(timerId: string, advanceFrom?: string): Promise<PomodoroState> {
  return locked(() => startInterval(timerId, advanceFrom));
}

async function startInterval(timerId: string, advanceFrom?: string): Promise<PomodoroState> {
  const settings = getReminderSettings();
  if (!settings.pomodoroEnabled) throw new Error("Enable Pomodoro in extension preferences first");
  const timer = await getActiveTimer();
  if (timer?.id !== timerId) throw new Error("The work timer is no longer running");
  const previous = await getPomodoro(timer);
  const now = new Date();
  if (now.getTime() < new Date(timer.startedAt).getTime()) throw new Error("Correct your Mac clock before continuing");
  if (advanceFrom && (!previous || previous.intervalId !== advanceFrom || !isIntervalFinished(previous, now))) {
    throw new Error("The interval has changed or has not finished");
  }
  if (!advanceFrom && previous) return previous;
  const next = newInterval(timerId, settings, now, advanceFrom ? previous! : undefined);
  // Check again after the async reads so Stop Work cannot normally revive a stale session.
  if ((await getActiveTimer())?.id !== timerId) throw new Error("The work timer is no longer running");
  await LocalStorage.setItem(POMODORO_KEY, JSON.stringify(next));
  return next;
}

export async function endPomodoro(timerId: string): Promise<void> {
  await locked(async () => {
    const state = await getPomodoro({ id: timerId } as ActiveTimer);
    if (state) await LocalStorage.removeItem(POMODORO_KEY);
  });
}

export async function checkReminders(
  logs: WorkLog[],
  timer: ActiveTimer | null,
  now: Date,
): Promise<{ dailyReached: boolean; timerReached: boolean }> {
  await locked(async () => {
    // Re-read state under the lock rather than delivering an old UI snapshot.
    const currentTimer = await getActiveTimer();
    const settings = getReminderSettings();
    if (!settings.pomodoroEnabled) await LocalStorage.removeItem(POMODORO_KEY);
    const pomodoro = settings.pomodoroEnabled ? await getPomodoro(currentTimer) : null;
    const events = dueReminders(settings, logs, currentTimer, pomodoro, now);
    await deliverReminders(events, LocalStorage, (title, event) =>
      event.key.startsWith("pomodoro:")
        ? launchCommand({
            name: "start-work",
            type: LaunchType.UserInitiated,
            context: { pomodoroIntervalId: pomodoro!.intervalId },
          })
        : showToast({ style: Toast.Style.Success, title }),
    );
  });
  const dailyKey = `daily:${getStartOfToday(now).toISOString()}`;
  return {
    dailyReached: Boolean(await LocalStorage.getItem(notificationKey(dailyKey))),
    timerReached: Boolean(timer && (await LocalStorage.getItem(notificationKey(`timer:${timer.id}`)))),
  };
}
