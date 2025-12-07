/**
 * Date utility functions for the Fathom extension
 */

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface DateRanges {
  thisWeek: DateRange;
  lastWeek: DateRange;
  previousMonth: DateRange;
}

/**
 * Get date ranges for organizing meetings into sections
 * - This Week: Monday to today
 * - Last Week: Previous Monday to Sunday
 * - Previous Month: All of last month
 */
export function getDateRanges(): DateRanges {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // This week (Monday to Sunday)
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() + mondayOffset);

  // Last week
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setSeconds(lastWeekEnd.getSeconds() - 1);

  // Previous month
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(lastWeekStart);
  previousMonthEnd.setSeconds(previousMonthEnd.getSeconds() - 1);

  return {
    thisWeek: { start: thisWeekStart, end: now, label: "This Week" },
    lastWeek: { start: lastWeekStart, end: lastWeekEnd, label: "Last Week" },
    previousMonth: { start: previousMonthStart, end: previousMonthEnd, label: "Previous Month" },
  };
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, format: "short" | "long" = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (format === "long") {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Parse HH:MM:SS timestamp to seconds
 */
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(":");
  return parseInt(parts[0] || "0") * 3600 + parseInt(parts[1] || "0") * 60 + parseInt(parts[2] || "0");
}
