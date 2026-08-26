import { Cache } from "@raycast/api";

export const HISTORY_STORAGE_KEY = "history";

/** Key previously used by useCachedState, kept only for the one-time migration. */
const LEGACY_CACHE_KEY = "history";

const DEFAULT_MAX_HISTORY = 10;
const MAX_HISTORY_LIMIT = 100;

export interface HistoryEntry {
  query: string;
  results: string[];
  timestamp: number;
}

export function parseMaxHistory(raw: string | undefined): number {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_MAX_HISTORY;
  return Math.min(parsed, MAX_HISTORY_LIMIT);
}

/** Drops malformed entries and backfills timestamps missing from pre-migration data. */
export function normalizeEntries(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];

  const now = Date.now();

  return value.flatMap((raw, index) => {
    if (typeof raw !== "object" || raw === null) return [];

    const entry = raw as Partial<HistoryEntry>;
    if (typeof entry.query !== "string" || entry.query.trim().length === 0) return [];

    const results = Array.isArray(entry.results)
      ? entry.results.filter((result): result is string => typeof result === "string")
      : [];
    if (results.length === 0) return [];

    return [
      {
        query: entry.query,
        results,
        // Legacy entries have no timestamp; space the backfilled values so the
        // original oldest-to-newest ordering survives.
        timestamp: typeof entry.timestamp === "number" ? entry.timestamp : now - (value.length - index),
      },
    ];
  });
}

export function readLegacyHistory(): HistoryEntry[] {
  try {
    const serialized = new Cache().get(LEGACY_CACHE_KEY);
    if (!serialized) return [];
    return normalizeEntries(JSON.parse(serialized));
  } catch {
    return [];
  }
}

export function clearLegacyHistory(): void {
  try {
    new Cache().remove(LEGACY_CACHE_KEY);
  } catch {
    // The legacy cache is best-effort; failing to clear it is not worth surfacing.
  }
}
