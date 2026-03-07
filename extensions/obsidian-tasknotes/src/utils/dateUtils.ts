import { UTCDate } from "@date-fns/utc";
import {
  addDays,
  format,
  isThisYear,
  isBefore,
  formatISO,
  isSameDay,
  endOfWeek,
  startOfWeek,
  isWithinInterval,
} from "date-fns";

export function isFullDay(date?: string) {
  if (!date) {
    return undefined;
  }

  // Check if it's a date-only string (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return true;
  }

  // Check if it's a datetime string but represents midnight (full day)
  // This covers various midnight formats: T00:00:00, T00:00:00.000Z, T00:00:00+00:00, etc.
  if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.\d{3})?([Z]|[+-]\d{2}:\d{2})?$/.test(date)) {
    return true;
  }

  // Additional check: if the date object has time as exactly midnight
  try {
    const dateObj = new Date(date);
    if (
      dateObj.getUTCHours() === 0 &&
      dateObj.getUTCMinutes() === 0 &&
      dateObj.getUTCSeconds() === 0 &&
      dateObj.getUTCMilliseconds() === 0
    ) {
      return true;
    }
  } catch {
    // Invalid date, fall through to false
  }

  return false;
}

export function getDateString(date: string) {
  return isFullDay(date) ? date : formatISO(date, { representation: "date" });
}

/** Parse date string to a Date. For date-only (YYYY-MM-DD) strings, use local calendar date to avoid UTC midnight shifting to previous day. */
function parseToLocalDate(dateStr: string): Date {
  if (isFullDay(dateStr)) {
    const dateOnly = dateStr.slice(0, 10);
    const [y, m, d] = dateOnly.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

export function getTodayInLocalTime() {
  return formatISO(new Date(), { representation: "date" });
}

export function isOverdue(date?: string) {
  if (!date) {
    return undefined;
  }
  const taskDate = isFullDay(date) ? parseToLocalDate(date) : new Date(date);
  const ref = isFullDay(date) ? parseToLocalDate(getTodayInLocalTime()) : new Date();
  return isBefore(taskDate, ref);
}

export function isToday(date?: string) {
  if (!date) {
    return undefined;
  }
  const taskDate = isFullDay(date) ? parseToLocalDate(date) : new Date(date);
  const today = isFullDay(date) ? parseToLocalDate(getTodayInLocalTime()) : new Date();
  return isSameDay(taskDate, today);
}

export function isTomorrow(date: string) {
  const taskDate = isFullDay(date) ? parseToLocalDate(date) : new Date(date);
  const today = isFullDay(date) ? parseToLocalDate(getTodayInLocalTime()) : new Date();
  return isSameDay(taskDate, addDays(today, 1));
}

export function isThisWeek(date?: string) {
  if (!date) return false;

  // Don't include overdue, today and tomorrow in "this week"
  if (isOverdue(date) || isToday(date) || isTomorrow(date)) return false;

  const taskDate = parseToLocalDate(date);
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Start week on Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  return isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
}

export function isFullDayTask(date?: string) {
  if (!date) return false;

  const isFullDayDate = isFullDay(date);

  // Check if it's midnight (likely a full-day task) even if not detected by isFullDay
  const dateObj = new Date(date);
  const isMidnight = dateObj.getHours() === 0 && dateObj.getMinutes() === 0 && dateObj.getSeconds() === 0;

  return isFullDayDate || isMidnight;
}

export function displayDueDate(date?: string) {
  if (!date) {
    return undefined;
  }

  if (isToday(date)) {
    return "Today";
  }

  if (isTomorrow(date)) {
    return "Tomorrow";
  }

  const today = getTodayInLocalTime();
  const nextWeek = addDays(today, 7);

  if (isBefore(date, nextWeek)) {
    return format(new UTCDate(date), "eeee");
  }

  if (isThisYear(date)) {
    return format(new UTCDate(date), "dd MMMM");
  }

  return format(new UTCDate(date), "dd MMMM yyy");
}
