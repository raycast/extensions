import { LocalStorage } from "@raycast/api";
import { PERIOD_KEYS } from "./format";
import type { DateRange, SourceProviderKey } from "./types";
import type { ProviderUsageSnapshot } from "./usage-snapshot";

/** In-memory TTL — fast re-open / provider tab switch without rescanning logs. */
const SNAPSHOT_TTL_MS = 60_000;
const STALE_STORAGE_KEY = "tokentrack-last-good-snapshots";

type CacheEntry = {
  at: number;
  provider: SourceProviderKey;
  rangeKey: string;
  snapshot: ProviderUsageSnapshot;
};

type StoredStaleMap = Record<
  string,
  { at: number; snapshot: ProviderUsageSnapshot }
>;

let snapshotCache: CacheEntry | null = null;
/** Last non-empty snapshot — kept across TTL expiry until manual refresh. */
let lastGoodSnapshot: CacheEntry | null = null;

/** Load windows share a stable start; end is always `new Date()` and drifts every call. */
function rangeKey(range: DateRange): string {
  return String(range.start.getTime());
}

function staleStorageKey(
  provider: SourceProviderKey,
  range: DateRange,
): string {
  return `${provider}:${rangeKey(range)}`;
}

function readMemoryLastGood(
  provider: SourceProviderKey,
  range: DateRange,
): ProviderUsageSnapshot | null {
  const entry = lastGoodSnapshot;
  if (!entry) return null;
  if (entry.provider !== provider) return null;
  if (entry.rangeKey !== rangeKey(range)) return null;
  return entry.snapshot;
}

export function readUsageSnapshotCache(
  provider: SourceProviderKey,
  range: DateRange,
): ProviderUsageSnapshot | null {
  const entry = snapshotCache;
  if (!entry) return null;
  if (entry.provider !== provider) return null;
  if (entry.rangeKey !== rangeKey(range)) return null;
  if (Date.now() - entry.at > SNAPSHOT_TTL_MS) return null;
  return entry.snapshot;
}

export function snapshotHasUsage(snapshot: ProviderUsageSnapshot): boolean {
  return PERIOD_KEYS.some(
    (period) =>
      snapshot.periods[period].totalTokens > 0 ||
      snapshot.periods[period].estimatedCost > 0,
  );
}

export async function readLastGoodUsageSnapshot(
  provider: SourceProviderKey,
  range: DateRange,
): Promise<ProviderUsageSnapshot | null> {
  const mem = readMemoryLastGood(provider, range);
  if (mem) return mem;

  try {
    const raw = await LocalStorage.getItem<string>(STALE_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as StoredStaleMap;
    const entry = map[staleStorageKey(provider, range)];
    if (!entry?.snapshot || !snapshotHasUsage(entry.snapshot)) return null;
    lastGoodSnapshot = {
      at: entry.at,
      provider,
      rangeKey: rangeKey(range),
      snapshot: entry.snapshot,
    };
    return entry.snapshot;
  } catch {
    return null;
  }
}

async function persistLastGood(
  provider: SourceProviderKey,
  range: DateRange,
  snapshot: ProviderUsageSnapshot,
): Promise<void> {
  try {
    const raw = await LocalStorage.getItem<string>(STALE_STORAGE_KEY);
    const map: StoredStaleMap = raw ? JSON.parse(raw) : {};
    map[staleStorageKey(provider, range)] = {
      at: Date.now(),
      snapshot,
    };
    await LocalStorage.setItem(STALE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Raycast LocalStorage size limits — ignore if payload is too large.
  }
}

export function writeUsageSnapshotCache(
  provider: SourceProviderKey,
  range: DateRange,
  snapshot: ProviderUsageSnapshot,
): void {
  const entry: CacheEntry = {
    at: Date.now(),
    provider,
    rangeKey: rangeKey(range),
    snapshot,
  };
  snapshotCache = entry;
  if (snapshotHasUsage(snapshot)) {
    lastGoodSnapshot = entry;
    void persistLastGood(provider, range, snapshot);
  }
}

export function clearUsageSnapshotCache(): void {
  snapshotCache = null;
  lastGoodSnapshot = null;
  void LocalStorage.removeItem(STALE_STORAGE_KEY);
}
