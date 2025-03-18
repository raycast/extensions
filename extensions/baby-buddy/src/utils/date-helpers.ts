/**
 * Utility functions for handling dates and times
 */

/**
 * Formats a time string to ISO format if provided
 * Handles both ISO strings and HH:MM:SS format
 * @param timeString - The time string to format
 * @returns The formatted ISO string or undefined if no time string provided
 */
export function formatTimeToISO(timeString?: string): string | undefined {
  if (!timeString) return undefined;

  // If it already looks like an ISO string, return it
  if (timeString.includes("T") && timeString.includes("-") && timeString.includes(":")) {
    return timeString;
  }

  // If it's an HH:MM:SS format, convert to today's date with that time
  if (timeString.includes(":") && timeString.split(":").length >= 2) {
    const now = new Date();
    const parts = timeString.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts.length > 2 ? parseInt(parts[2], 10) : 0;

    now.setHours(hours);
    now.setMinutes(minutes);
    now.setSeconds(seconds);

    return now.toISOString();
  }

  // If it's a Date object that was stringified, parse it
  try {
    return new Date(timeString).toISOString();
  } catch (e) {
    return undefined;
  }
}

/**
 * Calculates duration between two times in HH:MM:SS format
 * @param startTime - ISO string for the start time
 * @param endTime - ISO string for the end time
 * @returns Duration string in HH:MM:SS format or undefined if times are invalid
 */
export function calculateDuration(startTime?: string, endTime?: string): string | undefined {
  if (!startTime || !endTime) return undefined;

  try {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Calculate the difference in milliseconds
    const diff = end.getTime() - start.getTime();

    // Convert to hours, minutes, seconds
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    // Format as HH:MM:SS
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } catch (e) {
    return undefined;
  }
}

/**
 * Validates that end time is after start time
 * @param startTime - The start time
 * @param endTime - The end time
 * @returns boolean indicating if the time range is valid
 */
export function validateTimeRange(startTime: Date, endTime: Date): boolean {
  return endTime > startTime;
}

/**
 * Formats a date for display with time ago information
 * @param dateString - ISO date string to format
 * @returns Formatted string like "2 hours ago"
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffInMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else {
    return "just now";
  }
}

/**
 * Formats a time for display with a tooltip containing additional details
 * @param dateString - ISO date string to format
 * @returns Object with text and tooltip properties
 */
export function formatTimeWithTooltip(dateString: string): { text: string; tooltip: string } {
  const date = new Date(dateString);

  // Format time ago for display
  const timeAgo = formatTimeAgo(dateString);

  // Format full date and time for tooltip
  const tooltip = date.toLocaleString();

  return { text: timeAgo, tooltip };
}

/**
 * Gets the start of today and end of today for filtering activities
 */
export function getTodayDateRange(): { start: Date; end: Date } {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  return { start: todayStart, end: todayEnd };
}
