import { addDays, format, formatISO, isThisYear, isBefore, isSameDay, parseISO } from "date-fns";

import { Task } from "../api";

export function isRecurring(task: Task) {
  return task.due?.is_recurring || false;
}

export function isExactTimeTask(task: Task) {
  if (!task.due) {
    return false;
  }

  return task.due.date.includes("T");
}

/**
 * Returns today's date in user's timezone toDateString. This ensures we use local timezone date.
 *
 * If it's 20th February at 6 AM UTC:
 * - This function will return 19th February at midnight UTC for Los Angeles timezone (GMT-8)
 * - This function will return 20th February at midnight UTC for Paris timezone (GMT+1)
 */
export function getToday() {
  return parseDay(undefined);
}

export function isOverdue(date: string) {
  const day = parseDay(date);
  const today = getToday();

  // We only consider overdue when is a day before as the app does not consider overdue items which were
  // supposed to happen earlier in the same day.
  return isBefore(day, today) && !isSameDay(day, today);
}

export function displayDate(dateString: string) {
  const date = parseISO(dateString);
  if (isOverdue(dateString)) {
    return isThisYear(date) ? format(date, "dd MMMM") : format(date, "dd MMMM yyy");
  }

  const today = getToday();

  if (isSameDay(date, today)) {
    return "Today";
  }

  if (isSameDay(date, addDays(today, 1))) {
    return "Tomorrow";
  }

  const nextWeek = addDays(today, 7);

  if (isBefore(date, nextWeek)) {
    return format(date, "eeee");
  }

  if (isThisYear(date)) {
    return format(date, "dd MMMM");
  }

  return format(date, "dd MMMM yyy");
}

export function displayDateTime(dateString: string, use12HourFormat: boolean) {
  const date = parseISO(dateString);
  return `${displayDate(dateString)} ${format(date, use12HourFormat ? "h:mm a" : "HH:mm")}`;
}

export function displayTime(dateString: string, use12HourFormat: boolean) {
  const date = parseISO(dateString);
  return format(date, use12HourFormat ? "h:mm a" : "HH:mm");
}

export function getAPIDate(date: Date): string {
  return formatISO(date, { representation: "date" });
}

export function parseDay(date: string | undefined): Date {
  if (date == undefined) {
    // Default to today in local time.
    return new Date(new Date().toDateString());
  }
  return new Date(parseISO(date).toDateString());
}
