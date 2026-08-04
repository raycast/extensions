/**
 * Shared time formatting utilities for agent usage providers.
 */

export function parseDate(value: string): Date | null {
  if (!value) return null;

  const isoDate = new Date(value);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const asMs = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
  const date = new Date(asMs);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatResetTime(value: string | null): string {
  if (!value) return "unknown";

  const date = parseDate(value);
  if (!date) return "unknown";

  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "now";

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return remainingHours > 0 ? `${diffDays}d ${remainingHours}h` : `${diffDays}d`;
  }
  if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m`;
  }
  return `${diffSeconds}s`;
}

/**
 * Returns the percentage of a quota that remains.
 * @param remaining - Units remaining (not yet consumed)
 * @param total     - Total quota size
 * @returns A number 0–100 representing the remaining percentage, clamped to [0, 100].
 */
export function getRemainingPercent(remaining: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (remaining / total) * 100));
}

/**
 * Formats a duration in seconds into a human-readable string.
 * @param seconds - Duration in seconds
 * @returns Formatted string like "30s", "5m", "2h 30m", "1d 12h"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

/**
 * Formats a fetch timestamp as a local clock time, e.g. "9:30 PM".
 *
 * A clock time is a fact about when the last fetch ran — it never needs to
 * tick or be re-derived, unlike a relative "ago" which goes stale the moment
 * it's rendered and (on a menu-bar command that can't tick) freezes at a
 * misleading value. Returns "" when there is no timestamp.
 */
export function formatClock(timestamp: number | undefined): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** The most recent of the given fetch timestamps, or undefined when none exist. */
export function latestTimestamp(timestamps: (number | undefined)[]): number | undefined {
  const known = timestamps.filter((value): value is number => typeof value === "number" && value > 0);
  return known.length > 0 ? Math.max(...known) : undefined;
}
