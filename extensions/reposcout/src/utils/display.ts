import type { RepositoryKind } from "../types/repository";

/**
 * Pure display formatters shared by the UI. Kept out of the React components so
 * they can be unit-tested directly.
 */

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

/**
 * Format a timestamp as a compact relative age (e.g. `5m`, `3h`, `2d`, `4mo`).
 * Returns an empty string for `null`. Future timestamps render as `now`.
 *
 * @param timestampMs Event time in unix ms, or `null`.
 * @param nowMs       Current time in unix ms.
 */
export function formatRelativeTime(timestampMs: number | null, nowMs: number): string {
  if (timestampMs === null) {
    return "";
  }
  const age = nowMs - timestampMs;
  if (age < MINUTE_MS) {
    return "now";
  }
  if (age < HOUR_MS) {
    return `${Math.floor(age / MINUTE_MS)}m`;
  }
  if (age < DAY_MS) {
    return `${Math.floor(age / HOUR_MS)}h`;
  }
  if (age < WEEK_MS) {
    return `${Math.floor(age / DAY_MS)}d`;
  }
  if (age < MONTH_MS) {
    return `${Math.floor(age / WEEK_MS)}w`;
  }
  if (age < YEAR_MS) {
    return `${Math.floor(age / MONTH_MS)}mo`;
  }
  return `${Math.floor(age / YEAR_MS)}y`;
}

/** A short human label for a repository kind. */
export function kindLabel(kind: RepositoryKind): string {
  switch (kind) {
    case "normal":
      return "Repository";
    case "worktree":
      return "Worktree";
    case "bare":
      return "Bare";
  }
}
