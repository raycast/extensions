/**
 * Formats a duration in seconds to a human-readable string.
 *
 * @param seconds - The duration in seconds
 * @param includeSeconds - Whether to include seconds in the output (default: true)
 * @returns Formatted time string (e.g., "1h 23m", "45m 12s", "23s")
 */
export function formatTime(seconds: number, includeSeconds = true): string {
  const totalMins = Math.floor(seconds / 60);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const secs = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${mins}m`;
  if (!includeSeconds) return `${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
