/**
 * Format seconds into a human-readable duration string
 * @param seconds - Time in seconds
 * @returns Formatted duration (e.g., "2h 30m", "45m", "3h")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0 && minutes === 0) {
    return "0m";
  }
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Parse duration string in Tempo format to seconds
 * Supports formats: "1h30m", "1h30", "2h", "45m", "1.5h", "1.5"
 * @param duration - Duration string
 * @returns Total seconds, or 0 if invalid
 */
export function parseDuration(duration: string): number {
  const normalized = duration.trim().toLowerCase();
  let totalSeconds = 0;

  // Match "1h30" format (hours followed by minutes without 'm')
  const hoursMinutesMatch = normalized.match(/^(\d+)\s*h\s*(\d+)$/);
  if (hoursMinutesMatch) {
    totalSeconds += parseInt(hoursMinutesMatch[1]) * 3600;
    totalSeconds += parseInt(hoursMinutesMatch[2]) * 60;
    return totalSeconds;
  }

  // Match hours and minutes patterns
  const hoursMatch = normalized.match(/(\d+(?:\.\d+)?)\s*h/);
  const minutesMatch = normalized.match(/(\d+)\s*m/);

  if (hoursMatch) {
    totalSeconds += parseFloat(hoursMatch[1]) * 3600;
  }
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1]) * 60;
  }

  // If no h or m pattern, try to parse as decimal hours
  if (!hoursMatch && !minutesMatch) {
    const hours = parseFloat(normalized);
    if (!isNaN(hours)) {
      totalSeconds = Math.floor(hours * 3600);
    }
  }

  return Math.floor(totalSeconds);
}
