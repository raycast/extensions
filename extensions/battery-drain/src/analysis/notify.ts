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
 * Whether two start times belong to the same process. Starts are reconstructed from ps's elapsed time
 * and rounded to the minute, and collection delay can put the same start on either side of a minute,
 * so they match within a tolerance. An unknown start (older data) matches anything.
 */
export function sameStart(a: number | undefined, b: number | undefined): boolean {
  return a === undefined || b === undefined || Math.abs(a - b) <= START_TOLERANCE_MS;
}

// top truncates names to 16 characters; ps has the full name (and is missing when ps fails).
const TOP_NAME_LENGTH = 16;

/** Whether two names are the same process's: equal, or top's truncated name and ps's full one. */
export function sameCommand(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return short.length >= TOP_NAME_LENGTH && long.startsWith(short);
}

/**
 * Identity is pid plus start time, not the name: a collector hiccup can drop a runaway for one run or
 * swap ps's full name for top's short one, and neither may notify again. A new process on a reused
 * pid has a different start time and does notify.
 */
function isSame(entry: NotifiedEntry, pid: number, start: number | undefined): boolean {
  return entry.pid === pid && sameStart(entry.start, start);
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
