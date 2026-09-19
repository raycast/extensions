/** Keep the end of a location readable without letting it crowd the status. */
export function compactScopeLabel(scope: string): string {
  const parts = scope.replace(/\s+/gu, " ").split("/").filter(Boolean);
  const label = parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : scope;
  const chars = Array.from(label.replace(/\s+/gu, " "));
  return chars.length > 40
    ? `${chars.slice(0, 25).join("")}…${chars.slice(-14).join("")}`
    : chars.join("");
}

/** Shown wherever a number is not available, in every formatter here. */
const UNKNOWN = "\u2014";

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes)) return UNKNOWN;
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, i);
  return `${i === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

/**
 * Index disk usage. Deliberately not formatSize: this one always keeps one
 * decimal and stops at GB, and the Index Stats string must not change.
 */
export function formatIndexBytes(value: number): string {
  // An unreadable index file used to render as "NaN KB".
  if (!Number.isFinite(value) || value < 0) return UNKNOWN;
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return UNKNOWN;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const total = Math.round(ms / 1000);
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  // An hour unit, because a full scan of a large cloud folder reaches one and
  // used to be reported in minutes alone.
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * How long ago, or how far ahead.
 *
 * Every unit floors rather than rounds, so a label never claims a bucket the
 * value has not reached: rounding reported 30 seconds as "1m ago" and 348 days
 * as "1y ago". A timestamp ahead of the clock is reported as ahead, because
 * clock skew and touched dates do happen and calling them "just now" made a
 * stale file look like the freshest thing in the list.
 *
 * `now` defaults to the wall clock; pass it to pin the boundaries in a test.
 */
export function relativeTime(ms: number, now?: number): string {
  if (!ms || !Number.isFinite(ms)) return UNKNOWN;
  const diff = (now ?? Date.now()) - ms;
  const span = distance(Math.abs(diff));
  if (span === undefined) return "just now";
  return diff < 0 ? `in ${span}` : `${span} ago`;
}

/** The largest whole unit that fits, or undefined below one minute. */
function distance(ms: number): string | undefined {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return undefined;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}
