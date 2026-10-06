/**
 * Extract a human-readable message from an unknown error value.
 * Prefers `error.message` when available, falls back to `String(error)`.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Truncate a string to a maximum length, appending "..." when truncated.
 */
export function truncateValue(value: string, maxLength = 100): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength) + "...";
}

/**
 * Format a timestamp as a human-readable relative time string.
 * Uses actual calendar months for durations over 30 days.
 */
export function formatRelativeTime(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const now = new Date();
  const then = new Date(ms);
  const months = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
  if (months < 12) return `${months}mo ago`;
  const years = now.getFullYear() - then.getFullYear();
  return `${years}y ago`;
}
