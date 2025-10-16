/**
 * Formats a duration number into a human-readable string with proper pluralization
 *
 * @param duration - The duration in minutes
 * @returns A string representation with "minute" or "minutes" based on the value
 */
export function durationString(duration: number): string {
  const suffix = duration === 1 ? "minute" : "minutes";
  return `${duration} ${suffix}`;
}

/**
 * Formats a session count into a human-readable string with proper pluralization
 *
 * @param length - The number of sessions
 * @returns A string representation with "session" or "sessions" based on the value
 */
export function sessionString(length: number): string {
  const suffix = length === 1 ? "session" : "sessions";
  return `${length} ${suffix}`;
}

/**
 * Formats a Date object into a string in the format "YYYY-MM-DD HH:MM:SS"
 *
 * @param date - The Date object to format
 * @returns A string representation of the time in 24-hour format with leading zeros
 * @example
 * // Returns "2025-05-11 14:05:09" for a date representing May 11, 2025 at 2:05:09 PM
 * formatDate(new Date())
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day} ${formatTime(date)}`;
}

/**
 * Formats a Date object's time part into a time string in the format "HH:MM:SS"
 *
 * @param date - The Date object to format
 * @returns A string representation of the time in 24-hour format with leading zeros
 * @example
 * // Returns "14:05:09" for a date representing 2:05:09 PM
 * formatTime(new Date())
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
