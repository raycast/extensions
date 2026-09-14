import { Entry } from "./types";
import { readEntryMetadata } from "./directory-listing";
import { createReadPool } from "./bounded-reads";
import { matchPath, matchesStats, parseQuery, TypeFilter } from "./query";

/**
 * Metadata deadline for cached-path validation, so the caller always settles.
 * These are metadata reads on paths seen earlier, so most resolve at once;
 * this binds the case where one lives on a cold network mount, whether it is
 * the path bar's single typed path or a batch of cached candidates.
 */
export const CACHED_METADATA_BUDGET_MS = 2000;

export type CachedCandidate = Pick<Entry, "path"> & Partial<Entry>;
export type RecentValidation = {
  entries: Entry[];
  partial: boolean;
  limited?: boolean;
};

/** Share physical reads across queries; only full cached rows can be fallbacks. */
export function createRecentValidator(stat = readEntryMetadata) {
  const read = createReadPool();
  return async (
    candidates: CachedCandidate[],
    options: {
      signal?: AbortSignal;
      budgetMs?: number;
      query?: string;
      typeFilter?: TypeFilter;
      limit?: number;
    } = {},
  ): Promise<RecentValidation> => {
    if (options.signal?.aborted) return { entries: [], partial: false };
    const active = new AbortController();
    const interrupt = () => active.abort();
    // Always bounded. The caller publishes one finished list, so an unbounded
    // wait here would be an unbounded wait for the list.
    const timer = setTimeout(interrupt, options.budgetMs ?? 1000);
    options.signal?.addEventListener("abort", interrupt, { once: true });
    const parsed = parseQuery(options.query ?? "", options.typeFilter);
    const limit = options.limit ?? 60;
    const found = new Map<string, Entry>();
    const checked = new Set<string>();
    let cursor = 0;
    let partial = false;
    const matches = (entry: Entry) =>
      matchPath(parsed, entry.path, entry.isDirectory) !== undefined &&
      matchesStats(parsed, entry);
    const snapshot = (fallback = false) => {
      const rows: Entry[] = [];
      const seen = new Set<string>();
      for (const cached of candidates) {
        if (rows.length >= limit) break;
        if (seen.has(cached.path)) continue;
        seen.add(cached.path);
        const entry = found.get(cached.path);
        if (entry) rows.push(entry);
        else if (
          fallback &&
          !checked.has(cached.path) &&
          typeof cached.isDirectory === "boolean" &&
          typeof cached.name === "string" &&
          matches(cached as Entry)
        )
          rows.push(cached as Entry);
      }
      return rows;
    };
    const worker = async () => {
      while (
        !active.signal.aborted &&
        cursor < candidates.length &&
        found.size < limit
      ) {
        const cached = candidates[cursor++];
        try {
          const entry = await read(
            cached.path,
            () => stat(cached.path),
            active.signal,
          );
          if (active.signal.aborted) return;
          checked.add(cached.path);
          if (entry && matches(entry)) {
            found.set(cached.path, {
              ...entry,
              lastUsedMs: cached.lastUsedMs,
              useCount: cached.useCount,
            });
          }
        } catch {
          partial = true;
        }
      }
    };
    try {
      await Promise.all(
        Array.from({ length: Math.min(8, candidates.length) }, worker),
      );
      const cancelled = options.signal?.aborted;
      const limited =
        found.size > limit ||
        (found.size >= limit && cursor < candidates.length);
      partial ||= active.signal.aborted || limited;
      return {
        entries: cancelled ? [] : snapshot(partial),
        partial: !cancelled && partial,
        limited: !cancelled && limited,
      };
    } finally {
      interrupt();
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", interrupt);
    }
  };
}
export const validateRecentEntries = createRecentValidator();
