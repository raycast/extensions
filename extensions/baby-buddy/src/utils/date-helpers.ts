/**
 * Utility functions for handling dates and times
 */

import { differenceInSeconds, formatDistanceToNow, parseISO } from "date-fns";

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
 * Formats a time relative to now (e.g., "2 hours ago")
 * @param dateString - ISO date string to format
 * @returns Formatted string like "2 hours ago"
 */
export function formatTimeAgo(dateString: string | undefined): string {
  if (!dateString) return "Unknown";
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error("Error parsing date:", error);
    return "Invalid date";
  }
}

/**
 * Formats a date as a full date and time string
 * @param dateString - ISO date string to format
 * @returns Formatted date and time string
 */
export function formatFullTime(dateString: string | undefined): string {
  if (!dateString) return "Unknown";
  try {
    const date = parseISO(dateString);
    // Format without leading zeros and with seconds
    const hours = date.getHours() % 12 || 12; // Convert 0 to 12 for 12-hour format
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = date.getHours() >= 12 ? "PM" : "AM";
    const month = date.getMonth() + 1; // getMonth() is zero-based
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month}/${day}/${year} ${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} ${ampm}`;
  } catch (error) {
    console.error("Error formatting full time:", error);
    return "Invalid date";
  }
}

/**
 * Formats a time for display with a tooltip containing additional details
 * @param dateString - ISO date string to format
 * @returns Object with text and tooltip properties
 */
export function formatTimeWithTooltip(dateString: string | undefined): { text: string; tooltip: string } {
  return {
    text: formatTimeAgo(dateString),
    tooltip: formatFullTime(dateString),
  };
}

/**
 * Format a duration string into a more readable format
 * @param durationString Baby Buddy duration string in format "HH:MM:SS"
 * @returns Formatted duration string like "2h 30m"
 */
export function formatDuration(durationString: string | undefined): string {
  if (!durationString) return "Unknown";

  // Baby Buddy durations are in format "HH:MM:SS"
  const parts = durationString.split(":");
  if (parts.length !== 3) return durationString;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return parts[2] + "s";
  }
}

/**
 * Calculates and formats the elapsed time since a start time
 * @param startTimeString - ISO string of the start time
 * @returns Formatted elapsed time (e.g., "2h 30m 15s")
 */
export function calculateElapsedTime(startTimeString: string): string {
  try {
    const startTime = parseISO(startTimeString);
    const now = new Date();
    const seconds = differenceInSeconds(now, startTime);

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  } catch (error) {
    console.error("Error calculating elapsed time:", error);
    return "Unknown";
  }
}

/**
 * Calculates and formats the precise elapsed time since a given date string.
 * @param dateString - ISO date string
 * @returns Formatted string like "1h 23m 45s ago" or "Invalid date"
 */
export function formatPreciseTimeAgo(dateString: string | undefined): string {
  if (!dateString) return "Unknown";
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const seconds = differenceInSeconds(now, date);

    if (seconds < 0) return "in the future"; // Handle cases where the date is in the future
    if (seconds < 60) return `${seconds}s ago`;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let result = "";
    if (hours > 0) {
      result += `${hours}h `;
    }
    if (minutes > 0) {
      result += `${minutes}m `;
    }
    if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) {
      // Show seconds if less than a minute or if needed for precision when minutes/hours are present
      result += `${remainingSeconds}s`;
    }

    return result.trim() + " ago";
  } catch (error) {
    return "Invalid date";
  }
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
