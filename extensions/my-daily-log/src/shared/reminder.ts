import { addDays, startOfDay } from "./dates";

export type ReminderSettings = {
  intervalMinutes: number;
  /** Minutes since midnight */
  startMinutes: number;
  /** Minutes since midnight. Can be lower than `startMinutes` for working hours that cross midnight. */
  endMinutes: number;
  weekdaysOnly: boolean;
};

export type ReminderState = {
  /** Whether it's time to log something */
  isDue: boolean;
  /** Whether reminders are active right now (inside working hours and not snoozed) */
  isActive: boolean;
  /** When the next reminder is (or was) due, if it happens inside the current working period */
  dueAt?: Date;
};

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function atMinutes(day: Date, minutes: number): Date {
  const date = startOfDay(day);
  date.setMinutes(minutes);
  return date;
}

/** Start and end of the working period `now` belongs to, if any. */
export function currentWorkingPeriod(now: Date, settings: ReminderSettings): { start: Date; end: Date } | undefined {
  const minutes = minutesSinceMidnight(now);
  const { startMinutes, endMinutes } = settings;
  let start: Date;
  let end: Date;

  if (startMinutes === endMinutes) {
    // Always on
    start = atMinutes(now, 0);
    end = atMinutes(addDays(now, 1), 0);
  } else if (startMinutes < endMinutes) {
    if (minutes < startMinutes || minutes >= endMinutes) {
      return undefined;
    }
    start = atMinutes(now, startMinutes);
    end = atMinutes(now, endMinutes);
  } else if (minutes >= startMinutes) {
    start = atMinutes(now, startMinutes);
    end = atMinutes(addDays(now, 1), endMinutes);
  } else if (minutes < endMinutes) {
    start = atMinutes(addDays(now, -1), startMinutes);
    end = atMinutes(now, endMinutes);
  } else {
    return undefined;
  }

  const day = start.getDay();
  if (settings.weekdaysOnly && (day === 0 || day === 6)) {
    return undefined;
  }
  return { start, end };
}

export function getReminderState(
  now: Date,
  lastLogDate: Date | undefined,
  settings: ReminderSettings,
  snoozedUntil?: Date,
): ReminderState {
  const period = currentWorkingPeriod(now, settings);
  if (!period || (snoozedUntil && snoozedUntil.getTime() > now.getTime())) {
    return { isDue: false, isActive: false };
  }
  const references = [period.start.getTime()];
  if (lastLogDate && lastLogDate.getTime() <= now.getTime()) {
    references.push(lastLogDate.getTime());
  }
  if (snoozedUntil) {
    references.push(snoozedUntil.getTime());
  }
  const dueAt = new Date(Math.max(...references) + settings.intervalMinutes * 60_000);
  if (dueAt.getTime() > period.end.getTime()) {
    return { isDue: false, isActive: true };
  }
  return { isDue: now.getTime() >= dueAt.getTime(), isActive: true, dueAt };
}
