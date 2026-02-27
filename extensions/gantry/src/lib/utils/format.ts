import type { PlistConfig } from "../types";
import { basename } from "path";

/**
 * Formats a future Date as a relative time string.
 * Examples: "in 2h 15m", "in 5m", "in 3d", "in <1m", "passed"
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = date.getTime() - now;

  if (diffMs < 0) {
    return "passed";
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) {
    const remainingHours = totalHours % 24;
    return remainingHours > 0
      ? `in ${totalDays}d ${remainingHours}h`
      : `in ${totalDays}d`;
  }

  if (totalHours > 0) {
    const remainingMinutes = totalMinutes % 60;
    return remainingMinutes > 0
      ? `in ${totalHours}h ${remainingMinutes}m`
      : `in ${totalHours}h`;
  }

  if (totalMinutes > 0) {
    return `in ${totalMinutes}m`;
  }

  return "in <1m";
}

/**
 * Truncates a string to maxLen characters, appending an ellipsis if truncated.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str;
  }
  if (maxLen <= 1) {
    return "\u2026";
  }
  return str.slice(0, maxLen - 1) + "\u2026";
}

/**
 * Extracts a short display name from plist config.
 * Uses ProgramArguments[0] or Program, returning just the filename (not full path).
 */
export function extractProgramName(config: PlistConfig): string {
  const fullPath =
    config.ProgramArguments?.[0] ?? config.Program ?? config.Label ?? "unknown";
  return basename(fullPath);
}
