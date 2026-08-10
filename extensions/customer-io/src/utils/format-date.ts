/**
 * Formats a Unix timestamp into a compact relative time string.
 * Examples: 5s, 33m, 2h, 1d, 20 Apr, Apr 2024
 */
export function formatRelativeTime(timestamp: number | undefined | null): string {
  // Handle invalid or missing timestamps
  if (timestamp === undefined || timestamp === null || isNaN(timestamp) || timestamp === 0) {
    return "-";
  }

  const now = Date.now();
  const date = new Date(timestamp * 1000);
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Less than 1 minute
  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }

  // Less than 1 hour
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  // Less than 24 hours
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  // Less than 7 days
  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  // Less than 1 year - show day and month
  const currentYear = new Date().getFullYear();
  const dateYear = date.getFullYear();
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });

  if (dateYear === currentYear) {
    return `${day} ${month}`;
  }

  // More than 1 year - include year
  return `${month} ${dateYear}`;
}

/**
 * Formats a timestamp (in numbers) to a locale date string.
 */
export function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).toLocaleDateString();
}
