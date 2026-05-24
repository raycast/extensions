import { Cache } from "@raycast/api";
import type { BuildStatus } from "./drone";

const cache = new Cache({ namespace: "drone-build-notifier" });
const KEY = "seen-builds";
const LONG_RUNNING_KEY = "long-running-notified";
const MAX_ENTRIES = 500;
const MAX_LONG_RUNNING = 200;

export type SeenMap = Record<string, BuildStatus>;

export function loadSeen(): SeenMap {
  const raw = cache.get(KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as SeenMap;
    return {};
  } catch {
    return {};
  }
}

export function saveSeen(map: SeenMap): void {
  const entries = Object.entries(map);
  const bounded: SeenMap =
    entries.length > MAX_ENTRIES
      ? Object.fromEntries(entries.slice(-MAX_ENTRIES))
      : map;
  cache.set(KEY, JSON.stringify(bounded));
}

const TERMINAL: ReadonlySet<BuildStatus> = new Set<BuildStatus>([
  "success",
  "failure",
  "error",
  "killed",
  "declined",
]);

export function isTerminal(status: BuildStatus): boolean {
  return TERMINAL.has(status);
}

/**
 * Returns builds whose status just transitioned to a terminal state versus the
 * cached state. Mutates `seen` in place — caller must call `saveSeen(seen)`
 * after acting on the result.
 *
 * Bootstrap rule: on first run (empty cache) we silently record current state
 * without emitting notifications, so a fresh install never spams historical
 * builds.
 */
export function findNewlyFinished<
  T extends { id: number; status: BuildStatus },
>(builds: T[], seen: SeenMap): T[] {
  const isBootstrap = Object.keys(seen).length === 0;
  const result: T[] = [];
  for (const b of builds) {
    const key = String(b.id);
    const prev = seen[key];
    const becameTerminal = isTerminal(b.status) && prev !== b.status;
    if (becameTerminal && !isBootstrap) {
      result.push(b);
    }
    seen[key] = b.status;
  }
  return result;
}

/** Build IDs that already received a "still running after N min" banner. */
export function loadLongRunningNotified(): Set<number> {
  const raw = cache.get(LONG_RUNNING_KEY);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr)) {
      return new Set(arr.filter((v): v is number => typeof v === "number"));
    }
    return new Set();
  } catch {
    return new Set();
  }
}

export function saveLongRunningNotified(set: Set<number>): void {
  const arr = Array.from(set);
  const bounded =
    arr.length > MAX_LONG_RUNNING ? arr.slice(-MAX_LONG_RUNNING) : arr;
  cache.set(LONG_RUNNING_KEY, JSON.stringify(bounded));
}

const FAILURE_STATUSES: ReadonlySet<BuildStatus> = new Set<BuildStatus>([
  "failure",
  "error",
  "killed",
]);

/**
 * Counts trailing failures in a newest-first status list. Used to detect "X
 * failed N times in a row on this repo" so we can group/escalate the banner.
 */
export function failureStreak(
  historyNewestFirst: ReadonlyArray<BuildStatus>,
): number {
  let count = 0;
  for (const s of historyNewestFirst) {
    if (FAILURE_STATUSES.has(s)) count++;
    else break;
  }
  return count;
}
