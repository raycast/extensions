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
