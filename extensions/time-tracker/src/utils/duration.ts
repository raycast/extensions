/**
 * Parse duration input from various formats to decimal hours
 * Supported formats:
 * - "2.5" -> 2.5
 * - "2h30" -> 2.5
 * - "2:30" -> 2.5
 * - "2h" -> 2
 * - "30m" -> 0.5
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase();

  // Format: "2.5" or "2,5" (decimal)
  const decimalMatch = trimmed.match(/^(\d+)[.,](\d+)$/);
  if (decimalMatch) {
    return parseFloat(decimalMatch[1] + "." + decimalMatch[2]);
  }

  // Format: "2" (just hours)
  const hoursOnlyMatch = trimmed.match(/^(\d+)$/);
  if (hoursOnlyMatch) {
    return parseInt(hoursOnlyMatch[1], 10);
  }

  // Format: "2h30" or "2h30m"
  const hhmMatch = trimmed.match(/^(\d+)h(\d+)m?$/);
  if (hhmMatch) {
    const hours = parseInt(hhmMatch[1], 10);
    const minutes = parseInt(hhmMatch[2], 10);
    return hours + minutes / 60;
  }

  // Format: "2h"
  const hoursMatch = trimmed.match(/^(\d+)h$/);
  if (hoursMatch) {
    return parseInt(hoursMatch[1], 10);
  }

  // Format: "30m"
  const minutesMatch = trimmed.match(/^(\d+)m$/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10) / 60;
  }

  // Format: "2:30"
  const colonMatch = trimmed.match(/^(\d+):(\d+)$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    return hours + minutes / 60;
  }

  return null;
}

/**
 * Format duration from decimal hours to readable string
 * Examples:
 * - 2.5 -> "2.5h"
 * - 0.5 -> "0.5h"
 * - 2.25 -> "2.25h"
 */
export function formatDuration(hours: number): string {
  return `${hours.toFixed(2).replace(/\.?0+$/, "")}h`;
}

/**
 * Format duration in hours and minutes
 * Examples:
 * - 2.5 -> "2h 30m"
 * - 0.5 -> "30m"
 * - 2 -> "2h"
 */
export function formatDurationDetailed(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (h === 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}
