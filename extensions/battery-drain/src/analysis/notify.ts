import { ProcessInfo } from "../types";
import { Runaway } from "./runaway";

export type NotifiedEntry = { pid: number; start?: number; at: number };

export const NOTIFY_TTL_MS = 24 * 60 * 60 * 1000;
const START_TOLERANCE_MS = 2 * 60 * 1000;

/** Process start time, rounded to the minute so successive runs agree despite rounding in etime. */
export function processStart(now: number, info: ProcessInfo | undefined): number | undefined {
  if (!info) return undefined;
  return Math.round((now - info.etimeSec * 1000) / 60_000) * 60_000;
}

/**
 * Identity is pid plus start time, not the name: a collector hiccup can drop a runaway for one run or
 * swap ps's full name for top's short one, and neither may notify again. A new process on a reused
 * pid has a different start time and does notify.
 */
function isSame(entry: NotifiedEntry, pid: number, start: number | undefined): boolean {
  if (entry.pid !== pid) return false;
  if (entry.start === undefined || start === undefined) return true;
  return Math.abs(entry.start - start) <= START_TOLERANCE_MS;
}

export function newRunaways(
  runaways: Runaway[],
  entries: NotifiedEntry[],
  startOf: (pid: number) => number | undefined,
): Runaway[] {
  return runaways.filter((r) => !entries.some((e) => isSame(e, r.pid, startOf(r.pid))));
}

/** Adds the runaways just announced and drops entries older than a day. */
export function recordNotified(
  entries: NotifiedEntry[],
  fresh: Runaway[],
  startOf: (pid: number) => number | undefined,
  now: number,
): NotifiedEntry[] {
  const added = fresh.map((r) => ({ pid: r.pid, start: startOf(r.pid), at: now }));
  return [...entries, ...added].filter((e) => now - e.at <= NOTIFY_TTL_MS);
}

export function appleScriptString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
