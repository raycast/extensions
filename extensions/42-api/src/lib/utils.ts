/**
 * Utility functions for the 42 API extension
 */

import { LocationStats, TimeComponents, DateRange } from "./types";

// =============================================================================
// TIME PARSING & FORMATTING
// =============================================================================

/**
 * Parse a time string from the API into components
 * @param timeString Format: "HH:MM:SS.microseconds" (e.g., "02:56:21.097917")
 */
export function parseTime(timeString: string): TimeComponents {
  const [timePart] = timeString.split(".");
  const [hours, minutes, seconds] = timePart.split(":").map(Number);

  return {
    hours,
    minutes,
    seconds,
    totalSeconds: hours * 3600 + minutes * 60 + seconds,
  };
}

/**
 * Format a time string to human-readable format
 * @param timeString Format: "HH:MM:SS.microseconds"
 * @returns Format: "2h 56m" or "2h 56m 21s"
 */
export function formatTime(timeString: string, includeSeconds = false): string {
  const { hours, minutes, seconds } = parseTime(timeString);

  if (includeSeconds) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Format seconds into a human-readable duration
 * @param totalSeconds Total number of seconds
 * @returns Format: "2h 56m" or "56m 21s" or "21s"
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

// =============================================================================
// LOCATION STATS CALCULATIONS
// =============================================================================

/**
 * Calculate total seconds from location stats
 */
export function calculateTotalSeconds(stats: LocationStats): number {
  let totalSeconds = 0;

  for (const timeString of Object.values(stats)) {
    const { totalSeconds: seconds } = parseTime(timeString);
    totalSeconds += seconds;
  }

  return totalSeconds;
}

/**
 * Calculate total time from location stats as formatted string
 */
export function calculateTotalTime(stats: LocationStats): string {
  const totalSeconds = calculateTotalSeconds(stats);
  return formatDuration(totalSeconds);
}

/**
 * Sort dates in descending order (most recent first)
 */
export function sortDatesDescending(dates: string[]): string[] {
  return [...dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
}

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Format a date to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get a date range for API queries
 * @param daysBack Number of days to look back (0 = today only)
 */
export function getDateRange(daysBack = 0): DateRange {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysBack);

  return {
    beginAt: formatDateString(startDate),
    endAt: formatDateString(tomorrow),
  };
}

/**
 * Get today's date range (for menu bar logtime)
 */
export function getTodayRange(): DateRange {
  return getDateRange(0);
}

// =============================================================================
// TIME CALCULATIONS FOR GOALS
// =============================================================================

/**
 * Calculate goal-related times
 */
export function calculateGoalTimes(currentLogtimeSeconds: number, goalHours: number, goalMinutes: number) {
  const goalSeconds = goalHours * 3600 + goalMinutes * 60;
  const remainingSeconds = Math.max(0, goalSeconds - currentLogtimeSeconds);
  const goalReached = currentLogtimeSeconds >= goalSeconds;

  const now = Date.now();
  const leavingTime = new Date(now + remainingSeconds * 1000);

  return {
    goalSeconds,
    remainingSeconds,
    goalReached,
    remainingTimeString: formatDuration(remainingSeconds),
    leavingTime,
  };
}
