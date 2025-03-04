/**
 * Formats an ISO timestamp into a human-readable relative date string.
 *
 * @param {string} isoTimestamp - The ISO 8601 formatted timestamp to format.
 * @returns {string} A human-readable string representing the relative time (e.g., "Today", "2 weeks ago", "1 year ago").
 *
 * @example
 * formatRelativeDate("2023-05-01T12:00:00Z") // Returns "2 months ago" (assuming current date is July 1, 2023)
 */
export function formatRelativeDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  }
}

export const debugEnabled = false;

/**
 * Removes ANSI escape codes from the output string.
 *
 * @param output - The string containing ANSI escape codes to be cleaned.
 * @returns The cleaned string with ANSI escape codes removed.
 */
export const cleanDevpodOutput = (output: string) => output.replace(/\[[0-9;]*[JKmsu]/g, "");
