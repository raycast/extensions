import { getStartOfToday } from "./date";
import { createReport } from "./reports";
import type { ActiveTimer, WorkLog } from "./types";

export type ReminderSettings = {
  pomodoroEnabled: boolean;
  dailyAlertEnabled: boolean;
  dailyAlertMinutes: number;
  timerAlertEnabled: boolean;
  timerAlertMinutes: number;
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
};

export function positiveInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof parsed === "number" && Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 525600
    ? parsed
    : fallback;
}

export type PomodoroPhase = "work" | "short-break" | "long-break";
export type PomodoroState = {
  timerId: string;
  intervalId: string;
  phase: PomodoroPhase;
  startedAt: string;
  endsAt: string;
  completedWork: number;
  longBreakEvery: number;
};

export function phaseLabel(phase: PomodoroPhase): string {
  return phase === "work" ? "Work" : phase === "short-break" ? "Short Break" : "Long Break";
}

export function nextPhase(state: PomodoroState): PomodoroPhase {
  if (state.phase !== "work") return "work";
  return (state.completedWork + 1) % state.longBreakEvery === 0 ? "long-break" : "short-break";
}

export function newInterval(
  timerId: string,
  settings: ReminderSettings,
  now: Date,
  previous?: PomodoroState,
): PomodoroState {
  const phase = previous ? nextPhase(previous) : "work";
  const minutes =
    phase === "work"
      ? settings.workMinutes
      : phase === "short-break"
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;
  return {
    timerId,
    intervalId: crypto.randomUUID(),
    phase,
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + minutes * 60000).toISOString(),
    completedWork: previous ? previous.completedWork + (previous.phase === "work" ? 1 : 0) : 0,
    longBreakEvery: settings.longBreakEvery,
  };
}

export function isIntervalFinished(state: PomodoroState, now: Date): boolean {
  return now.getTime() >= new Date(state.endsAt).getTime();
}

export type ReminderEvent = { key: string; title: string };

export function dueReminders(
  settings: ReminderSettings,
  logs: WorkLog[],
  timer: ActiveTimer | null,
  pomodoro: PomodoroState | null,
  now: Date,
): ReminderEvent[] {
  const events: ReminderEvent[] = [];
  if (
    settings.dailyAlertEnabled &&
    createReport("today", logs, [], timer, now).totalSeconds >= settings.dailyAlertMinutes * 60
  ) {
    events.push({
      key: `daily:${getStartOfToday(now).toISOString()}`,
      title: `Today's work reached ${settings.dailyAlertMinutes} minutes`,
    });
  }
  if (
    timer &&
    settings.timerAlertEnabled &&
    now.getTime() - new Date(timer.startedAt).getTime() >= settings.timerAlertMinutes * 60000
  ) {
    events.push({ key: `timer:${timer.id}`, title: `Work timer reached ${settings.timerAlertMinutes} minutes` });
  }
  if (settings.pomodoroEnabled && timer && pomodoro?.timerId === timer.id && isIntervalFinished(pomodoro, now)) {
    events.push({
      key: `pomodoro:${pomodoro.intervalId}`,
      title: `${phaseLabel(pomodoro.phase)} finished. Start ${phaseLabel(nextPhase(pomodoro))} from the menu bar`,
    });
  }
  return events;
}

export interface ReminderStore {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<unknown>;
}

export function notificationKey(eventKey: string): string {
  return `reminderNotified:${eventKey}`;
}

// Persist only after delivery succeeds, so failed deliveries can be retried.
export async function deliverReminders(
  events: ReminderEvent[],
  store: ReminderStore,
  notify: (title: string, event: ReminderEvent) => Promise<unknown>,
): Promise<void> {
  for (const event of events) {
    if (await store.getItem(notificationKey(event.key))) continue;
    await notify(event.title, event);
    await store.setItem(notificationKey(event.key), "true");
  }
}

export function isPomodoroState(value: unknown): value is PomodoroState {
  if (!value || typeof value !== "object") return false;
  const state = value as PomodoroState;
  return (
    typeof state.timerId === "string" &&
    state.timerId.length > 0 &&
    typeof state.intervalId === "string" &&
    state.intervalId.length > 0 &&
    ["work", "short-break", "long-break"].includes(state.phase) &&
    typeof state.startedAt === "string" &&
    Number.isFinite(Date.parse(state.startedAt)) &&
    typeof state.endsAt === "string" &&
    Date.parse(state.endsAt) > Date.parse(state.startedAt) &&
    Number.isSafeInteger(state.completedWork) &&
    state.completedWork >= 0 &&
    Number.isSafeInteger(state.longBreakEvery) &&
    state.longBreakEvery > 0
  );
}
