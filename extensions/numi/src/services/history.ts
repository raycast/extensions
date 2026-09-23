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

export type HistoryUpdater = (current: HistoryEntry[]) => HistoryEntry[];

export interface HistoryWriter {
  /** Adopt a value that came from storage. Ignored while writes are in flight. */
  sync(value: HistoryEntry[]): void;
  /** Queue a functional update. Resolves once it has been persisted. */
  mutate(updater: HistoryUpdater, persist: (next: HistoryEntry[]) => Promise<void>): Promise<void>;
}

/**
 * Serializes history writes over a single authoritative value.
 *
 * `useLocalStorage` only accepts a value, not a functional update, so callers
 * would otherwise persist a whole array derived from whatever the last render
 * captured. Two deletes issued before React re-renders would both start from
 * the same array and the first entry would come back. Updaters here read the
 * running value instead, and each one is advanced before its write is awaited
 * so the next queued update already sees it.
 *
 * Assumes a single writer. `useLocalStorage` reads the key once and never
 * subscribes to it, so a second concurrent writer would go unnoticed by this
 * one. That holds today because the view command is the only thing that
 * touches HISTORY_STORAGE_KEY - the AI tool only runs queries. Anything new
 * that needs to write history must go through this writer rather than calling
 * LocalStorage directly, and cross-process coordination would need storage
 * primitives LocalStorage does not offer.
 */
export function createHistoryWriter(): HistoryWriter {
  let current: HistoryEntry[] = [];
  let queue: Promise<unknown> = Promise.resolve();
  let inFlight = 0;

  return {
    sync(value) {
      // A queued update is ahead of anything storage can report, so adopting a
      // value mid-flight would roll it back.
      if (inFlight === 0) current = value;
    },

    mutate(updater, persist) {
      inFlight += 1;

      const write = queue.then(async () => {
        const next = updater(current);
        current = next;
        await persist(next);
      });

      queue = write
        .catch(() => undefined)
        .finally(() => {
          inFlight -= 1;
        });

      return write;
    },
  };
}

export interface AppendOptions {
  max: number;
  /** Query this typing session recorded a moment ago, if any. */
  supersedes?: string | null;
}

/**
 * Adds an entry, replacing the one this session just wrote when the new query
 * merely extends it.
 *
 * Numi answers partial input with something different from the input itself -
 * "340 GBP" gives "£ 340" - so pausing while typing "340 GBP to USD" would
 * otherwise leave an entry for every stop along the way. Only the query the
 * same session recorded last is replaced, so an older entry that happens to be
 * a prefix is left alone.
 */
export function appendEntry(current: HistoryEntry[], entry: HistoryEntry, options: AppendOptions): HistoryEntry[] {
  const withoutDuplicate = current.filter((existing) => existing.query !== entry.query);

  const supersedes = options.supersedes;
  const extendsPrevious = Boolean(supersedes) && supersedes !== entry.query && entry.query.startsWith(supersedes!);
  const pruned = extendsPrevious
    ? withoutDuplicate.filter((existing) => existing.query !== supersedes)
    : withoutDuplicate;

  return [...pruned, entry].slice(-options.max);
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
