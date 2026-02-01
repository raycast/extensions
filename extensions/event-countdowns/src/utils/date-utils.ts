import dayjs, { Dayjs } from "dayjs";
import { RepeatType } from "./types";

/**
 * Calculate the next occurrence date based on repeat type
 * @param baseDate - The original event date (YYYY-MM-DD)
 * @param repeat - The repeat type (none, yearly, monthly)
 * @returns The next occurrence as a Dayjs object
 */
export function getNextOccurrence(baseDate: string, repeat: RepeatType): Dayjs {
  const base = dayjs(baseDate);
  const today = dayjs().startOf("day");

  if (repeat === "none") {
    return base;
  }

  if (repeat === "yearly") {
    // Set to this year's same month/day
    let next = base.year(today.year());
    // If already passed, move to next year
    if (next.isBefore(today)) {
      next = next.add(1, "year");
    }
    return next;
  }

  if (repeat === "monthly") {
    // Set to this month's same day
    let next = base.year(today.year()).month(today.month());
    // If already passed, move to next month
    if (next.isBefore(today)) {
      next = next.add(1, "month");
    }
    // Day.js handles month-end overflow automatically
    return next;
  }

  return base;
}

/**
 * Calculate the number of days remaining until the target date
 * Today = 0, Tomorrow = 1, etc.
 * @param nextDate - The target date
 * @returns Number of days remaining
 */
export function getDaysRemaining(nextDate: Dayjs): number {
  const today = dayjs().startOf("day");
  return nextDate.startOf("day").diff(today, "day");
}

/**
 * Check if a one-time event is in the past
 * @param baseDate - The event date (YYYY-MM-DD)
 * @param repeat - The repeat type
 * @returns true if the event should be archived
 */
export function shouldArchive(baseDate: string, repeat: RepeatType): boolean {
  if (repeat !== "none") {
    return false;
  }
  const base = dayjs(baseDate).startOf("day");
  const today = dayjs().startOf("day");
  return base.isBefore(today);
}

/**
 * Format a date for display
 * @param date - The date to format (YYYY-MM-DD string or Dayjs)
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatDate(date: string | Dayjs): string {
  return dayjs(date).format("YYYY-MM-DD");
}

/**
 * Get repeat type display label
 * @param repeat - The repeat type
 * @returns Human-readable label
 */
export function getRepeatLabel(repeat: RepeatType): string {
  switch (repeat) {
    case "yearly":
      return "Yearly";
    case "monthly":
      return "Monthly";
    case "none":
    default:
      return "One-time";
  }
}

/**
 * Validate date string format (YYYY-MM-DD)
 * @param dateString - The date string to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateDateString(dateString: string): string | undefined {
  if (!dateString || !dateString.trim()) {
    return "Date is required";
  }

  // Check format with regex
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return "Invalid format. Use YYYY-MM-DD (e.g., 2025-12-25)";
  }

  // Check if it's a valid date
  const parsed = dayjs(dateString, "YYYY-MM-DD", true);
  if (!parsed.isValid()) {
    return "Invalid date";
  }

  return undefined;
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns Today's date string
 */
export function getTodayString(): string {
  return dayjs().format("YYYY-MM-DD");
}
