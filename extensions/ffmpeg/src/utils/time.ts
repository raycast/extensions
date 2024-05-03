/**
 * Format time in seconds to HH:MM:SS
 *
 * @param seconds
 * @returns {string}
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const hoursStr = hours.toString().padStart(2, "0");
  const minutesStr = minutes.toString().padStart(2, "0");
  const remainingSecondsStr = remainingSeconds.toString().padStart(2, "0");

  return `${hoursStr}:${minutesStr}:${remainingSecondsStr}`;
}

/**
 * Get time in seconds from time string in HH:MM:SS format
 *
 * @param timeStr
 * @returns {number}
 */
export function getTimeInSeconds(timeStr: string): number {
  const [hours, minutes, seconds] = timeStr.split(":");

  return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
}
