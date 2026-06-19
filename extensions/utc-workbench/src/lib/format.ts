import { DateTime } from "luxon";

/**
 * Format a delta in milliseconds as a human-readable string.
 * Auto-scales from ms → s → min → hr.
 */
export function formatDelta(deltaMs: number): string {
  const abs = Math.abs(deltaMs);
  const sign = deltaMs < 0 ? "-" : "+";

  if (abs < 1000) {
    return `${sign}${abs.toString()}ms`;
  }
  if (abs < 60_000) {
    const s = (abs / 1000).toFixed(1);
    return `${sign}${s}s`;
  }
  if (abs < 3_600_000) {
    const min = Math.floor(abs / 60_000);
    const s = Math.round((abs % 60_000) / 1000);
    return s > 0 ? `${sign}${min.toString()}m ${s.toString()}s` : `${sign}${min.toString()}m`;
  }
  const hr = Math.floor(abs / 3_600_000);
  const min = Math.round((abs % 3_600_000) / 60_000);
  return min > 0 ? `${sign}${hr.toString()}h ${min.toString()}m` : `${sign}${hr.toString()}h`;
}

type FormatRelativeOptions = {
  /**
   * Omit sub-unit detail and extend to day-level. Produces "just now",
   * "2m ago", "3h ago", "yesterday", "5d ago" — for coarse recency hints.
   */
  coarse?: boolean;
};

/**
 * Format a relative time string (e.g., "2m 14s ago", "in 5m").
 * Pass `{ coarse: true }` for single-unit output with day-level support.
 */
export function formatRelative(epochMs: number, options?: FormatRelativeOptions): string {
  const now = DateTime.utc();
  const then = DateTime.fromMillis(epochMs, { zone: "utc" });
  const totalSeconds = Math.abs(now.diff(then).as("seconds"));
  const isPast = now.toMillis() > epochMs;

  if (options?.coarse === true) {
    const days = Math.floor(totalSeconds / 86_400);
    if (days >= 2) {
      const label = `${days.toString()}d`;
      return isPast ? `${label} ago` : `in ${label}`;
    }
    if (days === 1) return isPast ? "yesterday" : "tomorrow";
    const hours = Math.floor(totalSeconds / 3_600);
    if (hours >= 1) {
      const label = `${hours.toString()}h`;
      return isPast ? `${label} ago` : `in ${label}`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    if (minutes >= 1) {
      const label = `${minutes.toString()}m`;
      return isPast ? `${label} ago` : `in ${label}`;
    }
    return "just now";
  }

  if (totalSeconds < 60) {
    const s = Math.round(totalSeconds);
    const label = `${s.toString()}s`;
    return isPast ? `${label} ago` : `in ${label}`;
  }
  if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    const label = s > 0 ? `${m.toString()}m ${s.toString()}s` : `${m.toString()}m`;
    return isPast ? `${label} ago` : `in ${label}`;
  }
  if (totalSeconds < 86_400) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.round((totalSeconds % 3600) / 60);
    const label = m > 0 ? `${h.toString()}h ${m.toString()}m` : `${h.toString()}h`;
    return isPast ? `${label} ago` : `in ${label}`;
  }
  const d = Math.floor(totalSeconds / 86_400);
  const h = Math.round((totalSeconds % 86_400) / 3_600);
  const label = h > 0 ? `${d.toString()}d ${h.toString()}h` : `${d.toString()}d`;
  return isPast ? `${label} ago` : `in ${label}`;
}

/** Extract just the time portion (HH:mm:ss[.SSS]) from an ISO8601 UTC string. */
export function extractTime(iso: string): string {
  const match = /T(\d{2}:\d{2}:\d{2}(?:\.\d+)?)Z/.exec(iso);
  return match?.[1] ?? iso;
}

/** Extract just the date portion (YYYY-MM-DD) from an ISO8601 string. */
export function extractDate(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Escape a value for a CSV field: wrap in double-quotes if the value
 * contains commas, quotes, or newlines (per RFC 4180).
 */
export function escapeCsvField(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Trim a form-input string; return null for empty/whitespace-only values. */
export function trimOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
