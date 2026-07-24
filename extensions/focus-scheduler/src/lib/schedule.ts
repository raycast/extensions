import { FocusSchedule, Weekday } from "./types";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value.trim());
}

export function parseTimeToMinutes(value: string): number {
  const match = TIME_RE.exec(value.trim());
  if (!match) throw new Error(`Invalid time: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatWeekdays(days: Weekday[]): string {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (days.length === 7) return "Every day";
  const weekdays = [1, 2, 3, 4, 5] as Weekday[];
  if (weekdays.every((d) => days.includes(d)) && days.length === 5)
    return "Weekdays";
  if (days.includes(0) && days.includes(6) && days.length === 2)
    return "Weekends";
  return [...days]
    .sort((a, b) => {
      const order = (d: number) => (d === 0 ? 7 : d);
      return order(a) - order(b);
    })
    .map((d) => labels[d])
    .join(", ");
}

/** Duration of the window in seconds. Supports overnight windows (end < start). */
export function windowDurationSeconds(
  startTime: string,
  endTime: string,
): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  let minutes = end - start;
  if (minutes <= 0) minutes += 24 * 60;
  return minutes * 60;
}

/** Instant when the current window ends, relative to `date`. */
export function windowEndDate(
  startTime: string,
  endTime: string,
  date: Date = new Date(),
): Date {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const result = new Date(date);
  result.setSeconds(0, 0);

  if (start === end) {
    // Full-day: end at next local midnight
    result.setHours(24, 0, 0, 0);
    return result;
  }

  if (end > start) {
    result.setHours(Math.floor(end / 60), end % 60, 0, 0);
    return result;
  }

  // Overnight: if we're at/after start, end is tomorrow; else end is today
  if (nowMinutes >= start) {
    result.setDate(result.getDate() + 1);
  }
  result.setHours(Math.floor(end / 60), end % 60, 0, 0);
  return result;
}

/**
 * Seconds left until the schedule window ends from `date`.
 * Example: window 13:30–17:30 at 15:30 → 2 hours.
 */
export function remainingDurationSeconds(
  startTime: string,
  endTime: string,
  date: Date = new Date(),
): number {
  if (!isWithinWindow(startTime, endTime, date)) return 0;
  const endAt = windowEndDate(startTime, endTime, date);
  const seconds = Math.floor((endAt.getTime() - date.getTime()) / 1000);
  return Math.max(0, Math.min(seconds, 24 * 60 * 60));
}

export function isDaySelected(
  days: Weekday[],
  date: Date = new Date(),
): boolean {
  return days.includes(date.getDay() as Weekday);
}

/**
 * Whether `now` falls inside [start, end).
 * Overnight windows (end <= start) wrap past midnight.
 */
export function isWithinWindow(
  startTime: string,
  endTime: string,
  date: Date = new Date(),
): boolean {
  const now = date.getHours() * 60 + date.getMinutes();
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === end) {
    // Full-day window
    return true;
  }

  if (end > start) {
    return now >= start && now < end;
  }

  // Overnight: e.g. 22:00 → 06:00
  return now >= start || now < end;
}

/** Session key date: for overnight, attribute to the day the window started. */
export function sessionDateKey(
  startTime: string,
  endTime: string,
  date: Date = new Date(),
): string {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  const now = date.getHours() * 60 + date.getMinutes();

  if (end > start || start === end) {
    return toLocalDateKey(date);
  }

  // Overnight: early morning belongs to previous calendar day
  if (now < end) {
    const previous = new Date(date);
    previous.setDate(previous.getDate() - 1);
    return toLocalDateKey(previous);
  }

  return toLocalDateKey(date);
}

export function shouldStartSchedule(
  schedule: FocusSchedule,
  lastStartedDate: string | undefined,
  date: Date = new Date(),
): boolean {
  if (!schedule.enabled) return false;
  if (!isDaySelected(schedule.days, date) && !isOvernightCarry(schedule, date))
    return false;
  if (!isWithinWindow(schedule.startTime, schedule.endTime, date)) return false;

  const key = sessionDateKey(schedule.startTime, schedule.endTime, date);
  return lastStartedDate !== key;
}

function isOvernightCarry(schedule: FocusSchedule, date: Date): boolean {
  const start = parseTimeToMinutes(schedule.startTime);
  const end = parseTimeToMinutes(schedule.endTime);
  if (end > start || start === end) return false;

  const now = date.getHours() * 60 + date.getMinutes();
  if (now >= end) return false;

  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return isDaySelected(schedule.days, previous);
}

export function shouldCompleteSchedule(
  schedule: FocusSchedule,
  activeScheduleId: string | undefined,
  date: Date = new Date(),
): boolean {
  if (activeScheduleId !== schedule.id) return false;
  return !isWithinWindow(schedule.startTime, schedule.endTime, date);
}

export function describeSchedule(schedule: FocusSchedule): string {
  return `${formatWeekdays(schedule.days)} · ${schedule.startTime}–${schedule.endTime}`;
}
