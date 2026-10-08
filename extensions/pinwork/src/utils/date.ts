/**
 * Date formatting utilities for Pinwork Raycast extension.
 */

import {
  format,
  formatDistance,
  isToday,
  isTomorrow,
  isYesterday,
  differenceInDays,
  startOfDay,
} from "date-fns";

/**
 * Formats a date for display in task lists.
 * Shows relative dates for nearby dates, absolute for others.
 */
export function formatTaskDate(date: Date | undefined): string {
  if (!date) return "";

  if (isToday(date)) {
    return "Today";
  }

  if (isTomorrow(date)) {
    return "Tomorrow";
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }

  const daysFromNow = differenceInDays(
    startOfDay(date),
    startOfDay(new Date()),
  );

  // Within a week
  if (daysFromNow > 0 && daysFromNow <= 7) {
    return format(date, "EEEE"); // "Monday", "Tuesday", etc.
  }

  // Past dates (overdue)
  if (daysFromNow < 0 && daysFromNow >= -7) {
    return `${Math.abs(daysFromNow)} days ago`;
  }

  // Further out - show date
  return format(date, "MMM d"); // "Jan 25"
}

/**
 * Formats a date with time if present.
 */
export function formatTaskDateTime(
  date: Date | undefined,
  hasTime: boolean,
): string {
  if (!date) return "";

  const dateStr = formatTaskDate(date);

  if (hasTime) {
    const timeStr = format(date, "h:mm a"); // "2:30 PM"
    return `${dateStr} at ${timeStr}`;
  }

  return dateStr;
}

/**
 * Formats a deadline with urgency indication.
 */
export function formatDeadline(date: Date | undefined): string {
  if (!date) return "";

  const daysUntil = differenceInDays(startOfDay(date), startOfDay(new Date()));

  if (daysUntil < 0) {
    return `Overdue (${formatTaskDate(date)})`;
  }

  if (daysUntil === 0) {
    return "Due today";
  }

  if (daysUntil === 1) {
    return "Due tomorrow";
  }

  if (daysUntil <= 7) {
    return `Due ${format(date, "EEEE")}`;
  }

  return `Due ${format(date, "MMM d")}`;
}

/**
 * Checks if a date is overdue (past and not today).
 */
export function isOverdue(date: Date | undefined): boolean {
  if (!date) return false;
  return differenceInDays(startOfDay(date), startOfDay(new Date())) < 0;
}

/**
 * Formats time estimate in human-readable format.
 */
export function formatEstimate(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return "";

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Formats creation/modification date for detail views.
 */
export function formatFullDate(date: Date): string {
  return format(date, "MMMM d, yyyy 'at' h:mm a");
}

/**
 * Formats relative time for "last modified" displays.
 */
export function formatRelativeTime(date: Date): string {
  return formatDistance(date, new Date(), { addSuffix: true });
}
