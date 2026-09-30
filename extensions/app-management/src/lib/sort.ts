// Sorting and recency (SPEC.md §8). Pure: no Raycast or Node imports.
//
// "Recent in This Command" is named for what it measures: switches made through this command (`switchedAt`) and the
// app that was in front when the list was opened (`frontAt`, sampled from the window helper's zIndex 0 window). It is
// not a system-wide last-used history and never claims to be.

export type SortMode = "alphabetical" | "recent";
export const SORT_STORAGE_KEY = "sort.v1";
export const RECENT_STORAGE_KEY = "recent.v1";
export const RECENT_CAP = 50;

export const SORT_TITLES: Record<SortMode, string> = {
  alphabetical: "Alphabetical",
  recent: "Recent in This Command",
};

export type RecentStamp = { switchedAt?: number; frontAt?: number };
export type RecentMap = Record<string, RecentStamp>;

/** Unknown or missing → alphabetical; never throws, never writes. */
export function parseSort(raw: unknown): SortMode {
  return raw === "recent" ? "recent" : "alphabetical";
}

export function otherSort(sort: SortMode): SortMode {
  return sort === "recent" ? "alphabetical" : "recent";
}

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

/** Bundle IDs and positive timestamps only. Anything unreadable yields an empty map (recency is a convenience). */
export function parseRecent(raw: unknown): RecentMap {
  if (typeof raw !== "string") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  const out: RecentMap = {};
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!id || typeof value !== "object" || value === null) continue;
    const { switchedAt, frontAt } = value as Record<string, unknown>;
    const stamp: RecentStamp = {};
    if (isFiniteNumber(switchedAt)) stamp.switchedAt = switchedAt;
    if (isFiniteNumber(frontAt)) stamp.frontAt = frontAt;
    if (stamp.switchedAt !== undefined || stamp.frontAt !== undefined) out[id] = stamp;
  }
  return out;
}

export function serializeRecent(map: RecentMap): string {
  return JSON.stringify(map);
}

export function newestStamp(stamp: RecentStamp | undefined): number | undefined {
  if (!stamp) return undefined;
  const values = [stamp.switchedAt, stamp.frontAt].filter((v): v is number => v !== undefined);
  return values.length ? Math.max(...values) : undefined;
}

/** Keeps the RECENT_CAP newest entries by their newest stamp; ties by bundle ID so the result is deterministic. */
export function pruneRecent(map: RecentMap): RecentMap {
  const entries = Object.entries(map).sort(
    ([idA, a], [idB, b]) => (newestStamp(b) ?? 0) - (newestStamp(a) ?? 0) || idA.localeCompare(idB),
  );
  return Object.fromEntries(entries.slice(0, RECENT_CAP));
}

/** Returns a new map with one field stamped. Apps without a bundle ID are never recorded (pid keys are not stable). */
export function stampRecent(
  map: RecentMap,
  bundleId: string | undefined,
  field: keyof RecentStamp,
  at: number,
): RecentMap {
  if (!bundleId) return map;
  return pruneRecent({ ...map, [bundleId]: { ...map[bundleId], [field]: at } });
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** The minimum an ordering needs: name, stable key, bundle ID for stamps, and the smallest on-screen zIndex. */
export interface Sortable {
  key: string;
  name: string;
  bundleId?: string;
  /** Smallest zIndex among the app's on-screen windows; undefined when it has none. */
  frontZ?: number;
}

export function compareAlphabetical(a: Sortable, b: Sortable): number {
  return collator.compare(a.name, b.name) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
}

/**
 * §8.2 order: (1) stamped apps, newest first; (2) unstamped apps with an on-screen window, front to back by zIndex;
 * (3) everything else alphabetically. A missing zIndex never sorts above a known one; equal stamps fall back to
 * alphabetical, so identical inputs always give identical output.
 */
export function compareRecent(a: Sortable, b: Sortable, recent: RecentMap): number {
  const sa = a.bundleId ? newestStamp(recent[a.bundleId]) : undefined;
  const sb = b.bundleId ? newestStamp(recent[b.bundleId]) : undefined;
  if (sa !== undefined || sb !== undefined) {
    if (sa === undefined) return 1;
    if (sb === undefined) return -1;
    if (sa !== sb) return sb - sa;
    return compareAlphabetical(a, b);
  }
  if (a.frontZ !== undefined || b.frontZ !== undefined) {
    if (a.frontZ === undefined) return 1;
    if (b.frontZ === undefined) return -1;
    if (a.frontZ !== b.frontZ) return a.frontZ - b.frontZ;
    return compareAlphabetical(a, b);
  }
  return compareAlphabetical(a, b);
}

export function sortRows<T extends Sortable>(rows: T[], sort: SortMode, recent: RecentMap): T[] {
  const copy = [...rows];
  return sort === "recent" ? copy.sort((a, b) => compareRecent(a, b, recent)) : copy.sort(compareAlphabetical);
}
