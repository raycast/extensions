/**
 * Date formatting utilities for consistent date display across the application
 */

/**
 * Formats a date as relative time (e.g., "2 days ago", "3 weeks ago")
 * @param dateString - ISO date string to format
 * @returns Relative time string
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInSeconds < 60) return "just now";
  if (diffInMinutes < 60)
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  if (diffInDays < 7)
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  if (diffInWeeks < 4)
    return `${diffInWeeks} week${diffInWeeks !== 1 ? "s" : ""} ago`;
  return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`;
}

/**
 * Formats a duration between two times
 * @param startTime - Start time ISO string
 * @param finishTime - Finish time ISO string (optional, uses current time if not provided)
 * @returns Formatted duration string (e.g., "5m 23s", "1h 15m")
 */
export function formatDuration(
  startTime?: string,
  finishTime?: string,
): string {
  if (!startTime) return "Not started";

  const start = new Date(startTime);
  const end = finishTime ? new Date(finishTime) : new Date();

  // Check if dates are valid
  if (isNaN(start.getTime())) {
    return "Invalid start time";
  }
  if (finishTime && isNaN(end.getTime())) {
    return "Invalid end time";
  }

  const diffMs = end.getTime() - start.getTime();

  // If the difference is negative or unreasonably large, something is wrong
  if (diffMs < 0) {
    return "Future build";
  }

  // If duration is more than 3 hours, something is likely wrong with the data
  if (diffMs > 3 * 60 * 60 * 1000) {
    return "Check build times";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (diffMinutes > 60) {
    const hours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m ${diffSeconds}s`;
  } else {
    return `${diffSeconds}s`;
  }
}

/**
 * Formats a date into separate date and time strings
 * @param dateString - ISO date string to format
 * @returns Object with formatted date and time, or null if invalid
 */
export function formatCompactDateTime(
  dateString?: string,
): { date: string; time: string } | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch {
    return null;
  }
}

/**
 * Formats a date for display in lists (combines relative and absolute)
 * @param dateString - ISO date string to format
 * @returns Combined format string (e.g., "2 days ago (Dec 25)")
 */
export function formatListDate(dateString: string): string {
  const relative = formatRelativeDate(dateString);
  const date = new Date(dateString);
  const absolute = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${relative} (${absolute})`;
}
