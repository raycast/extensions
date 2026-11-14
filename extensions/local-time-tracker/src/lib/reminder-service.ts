import { environment, getPreferenceValues, launchCommand, LaunchType, LocalStorage } from "@raycast/api";
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
import type { ActiveTimer } from "./types";

const POMODORO_KEY = "pomodoroState";

export async function withReminderOperation<T>(action: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  return withReminderLock(join(environment.supportPath, "reminder-operation.lock"), action);
}

export function getReminderSettings(): ReminderSettings {
  const values = getPreferenceValues<Preferences>();
  return {
    pomodoroEnabled: values.pomodoroEnabled !== false,
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

export async function getFinishedPomodoro(
  timer: ActiveTimer | null,
  now: Date = new Date(),
  expectedIntervalId?: string,
): Promise<PomodoroState | null> {
  if (!timer || !getReminderSettings().pomodoroEnabled || now.getTime() < Date.parse(timer.startedAt)) return null;
  const state = await getPomodoro(timer);
  return state && (!expectedIntervalId || state.intervalId === expectedIntervalId) && isIntervalFinished(state, now)
    ? state
    : null;
}

export async function startPomodoroInterval(timerId: string, advanceFrom?: string): Promise<PomodoroState> {
  return withReminderOperation(() => startPomodoroIntervalUnderLock(timerId, advanceFrom));
}

// The caller must hold withReminderOperation for this shared-state write.
export async function startPomodoroIntervalUnderLock(timerId: string, advanceFrom?: string): Promise<PomodoroState> {
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
  await withReminderOperation(async () => {
    const state = await getPomodoro({ id: timerId } as ActiveTimer);
    if (state) await LocalStorage.removeItem(POMODORO_KEY);
  });
}

export async function checkReminders(timer: ActiveTimer | null, now: Date): Promise<{ timerReached: boolean }> {
  await withReminderOperation(async () => {
    // Re-read state under the lock rather than delivering an old UI snapshot.
    const currentTimer = await getActiveTimer();
    const settings = getReminderSettings();
    if (!settings.pomodoroEnabled) await LocalStorage.removeItem(POMODORO_KEY);
    let pomodoro: PomodoroState | null = null;
    let pomodoroError: unknown;
    try {
      pomodoro = settings.pomodoroEnabled ? await getPomodoro(currentTimer) : null;
    } catch (error) {
      // Damaged overlay data must not disable unrelated work-time alerts.
      pomodoroError = error;
    }
    const events = dueReminders(settings, currentTimer, pomodoro, now);
    const pending = [];
    for (const event of events) {
      if (!(await LocalStorage.getItem(notificationKey(event.key)))) pending.push(event);
    }
    const timeAlertTitles = pending.filter((event) => !event.key.startsWith("pomodoro:")).map((event) => event.title);
    const context = {
      ...(timeAlertTitles.length ? { timeAlertTitles } : {}),
      ...(pending.some((event) => event.key.startsWith("pomodoro:"))
        ? { pomodoroIntervalId: pomodoro!.intervalId }
        : {}),
    };
    // A single foreground launch keeps simultaneous alerts together instead of
    // replacing one notification with another. Each event retains its own ID.
    let notification: Promise<void> | undefined;
    await deliverReminders(
      events,
      LocalStorage,
      () => (notification ??= launchCommand({ name: "start-work", type: LaunchType.UserInitiated, context })),
    );
    if (pomodoroError) throw pomodoroError;
  });
  return {
    timerReached: Boolean(timer && (await LocalStorage.getItem(notificationKey(`timer:${timer.id}`)))),
  };
}
