/**
 * Date formatting utilities for consistent date display across the app
 */

/**
 * Formats a date in a consistent, readable format
 * @param date - The date to format
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats the difference in days until delivery in a human-readable format
 * @param days - Number of days until delivery
 * @returns Formatted string describing the delivery timeline
 */
export function formatDayDifference(days: number): string {
  if (days === 0) {
    return "Delivery expected today";
  } else if (days === 1) {
    return "1 day until delivery";
  } else {
    return `${days} days until delivery`;
  }
}
