import { Entry } from "./types";
import { readEntryMetadata } from "./directory-listing";
import { createReadPool } from "./bounded-reads";
import { matchPath, matchesStats, parseQuery, TypeFilter } from "./query";

export type CachedCandidate = Pick<Entry, "path"> & Partial<Entry>;
export type RecentValidation = {
  entries: Entry[];
  partial: boolean;
  limited?: boolean;
  cancelled?: boolean;
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
      onProgress?: (entries: Entry[]) => void;
      /** Continue validating while the query remains active. */
      continuous?: boolean;
    } = {},
  ): Promise<RecentValidation> => {
    if (options.signal?.aborted)
      return { entries: [], partial: false, cancelled: true };
    const active = new AbortController();
    const interrupt = () => active.abort();
    const timer = options.continuous
      ? undefined
      : setTimeout(interrupt, options.budgetMs ?? 1000);
    options.signal?.addEventListener("abort", interrupt, { once: true });
    const parsed = parseQuery(options.query ?? "", options.typeFilter);
    const limit = options.limit ?? (options.continuous ? Infinity : 60);
    const found = new Map<string, Entry>();
    const checked = new Set<string>();
    let cursor = 0;
    let partial = false;
    let lastPublished = 0;
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
            if (!options.continuous || Date.now() - lastPublished >= 100) {
              lastPublished = Date.now();
              options.onProgress?.(snapshot());
            }
          }
        } catch {
          partial = true;
        }
      }
    };
    // A slow provider may keep its physical slots; cached rows remain usable.
    const fallback = options.continuous
      ? setTimeout(() => {
          if (!active.signal.aborted) options.onProgress?.(snapshot(true));
        }, 1000)
      : undefined;
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
        cancelled,
        limited: !cancelled && limited,
      };
    } finally {
      interrupt();
      clearTimeout(timer);
      clearTimeout(fallback);
      options.signal?.removeEventListener("abort", interrupt);
    }
  };
}
export const validateRecentEntries = createRecentValidator();
