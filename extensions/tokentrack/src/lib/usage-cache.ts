import type { DateRange, SourceProviderKey } from "./types";
import type { ProviderUsageSnapshot } from "./usage-snapshot";

/** In-memory TTL — fast re-open / provider tab switch without rescanning logs. */
const SNAPSHOT_TTL_MS = 60_000;

type CacheEntry = {
  at: number;
  provider: SourceProviderKey;
  rangeKey: string;
  snapshot: ProviderUsageSnapshot;
};

let snapshotCache: CacheEntry | null = null;

function rangeKey(range: DateRange): string {
  return `${range.start.getTime()}:${range.end.getTime()}`;
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

export function writeUsageSnapshotCache(
  provider: SourceProviderKey,
  range: DateRange,
  snapshot: ProviderUsageSnapshot,
): void {
  snapshotCache = {
    at: Date.now(),
    provider,
    rangeKey: rangeKey(range),
    snapshot,
  };
}

export function clearUsageSnapshotCache(): void {
  snapshotCache = null;
}
