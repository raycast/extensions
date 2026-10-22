/**
 * Homebrew search utilities.
 *
 * Provides functions for searching formulae and casks using chunked cache.
 * This approach significantly reduces memory usage by:
 * 1. Loading only a small index (~600KB) instead of all data (~15MB)
 * 2. Filtering on the index before loading actual data
 * 3. Loading only the chunks containing matching results
 */

import { Cask, Formula, InstallableResults, DownloadProgress, IndexEntry } from "../types";
import { searchLogger } from "../logger";
import {
  fetchFormulaIndex,
  fetchCaskIndex,
  fetchFormulaItems,
  fetchCaskItems,
  cachedFormulaIndex,
  cachedCaskIndex,
} from "./fetch";
import { brewCompare } from "./helpers";
import { PopularityRanks, byPopularity } from "./analytics";

/** Progress callback for search download phases */
export interface SearchDownloadProgress {
  /** Current phase: which file is being downloaded */
  phase: "casks" | "formulae" | "parsing" | "complete";
  /** Download progress for casks (if downloading) */
  casksProgress?: DownloadProgress;
  /** Download progress for formulae (if downloading) */
  formulaeProgress?: DownloadProgress;
}

export type SearchProgressCallback = (progress: SearchDownloadProgress) => void;

/**
 * Search for packages matching the given text.
 * Uses chunked cache for memory efficiency - only loads matching results.
 *
 * @param searchText - The text to search for
 * @param limit - Maximum number of results per category
 * @param signal - AbortSignal for cancellation
 * @param onProgress - Optional callback for progress updates
 * @param ranks - When given, results are ordered by install count instead of
 *   name relevance. Ranking happens on the full match set, *before* the limit
 *   is applied, so the top results are the most installed matches overall.
 * @param offset - Where the window starts. Results are a WINDOW, not a growing
 *   list: page 40 loads the same number of records as page 1, which is what
 *   keeps the command under Raycast's memory ceiling. See `utils/paging.ts`.
 * @returns Matching formulae and casks
 */
export async function brewSearch(
  searchText: string,
  limit?: number,
  signal?: AbortSignal,
  onProgress?: SearchProgressCallback,
  ranks?: PopularityRanks,
  offset = 0,
): Promise<InstallableResults> {
  searchLogger.log("Searching", { query: searchText, limit, offset, sortByPopularity: ranks != undefined });

  // Track progress for both downloads
  let casksProgress: DownloadProgress | undefined;
  let formulaeProgress: DownloadProgress | undefined;

  // Phase 1: Load indexes concurrently (small, ~600KB each)
  // IMPORTANT: Do NOT pass the abort signal to index fetching.
  // The index download is a shared resource that must complete regardless of
  // search query changes. useCachedPromise aborts on every keystroke, which
  // would repeatedly restart the (slow) initial index download.
  onProgress?.({ phase: "casks" });

  const [caskIndex, formulaIndex] = await Promise.all([
    fetchCaskIndex((progress) => {
      casksProgress = progress;
      onProgress?.({
        phase: "casks",
        casksProgress: progress,
        formulaeProgress,
      });
    }),
    fetchFormulaIndex((progress) => {
      formulaeProgress = progress;
      onProgress?.({
        phase: "formulae",
        casksProgress,
        formulaeProgress: progress,
      });
    }),
  ]);

  // Check for abort after index load (search query may have changed)
  if (signal?.aborted) {
    const error = new Error("Aborted");
    error.name = "AbortError";
    throw error;
  }

  // Phase 2: Filter on index (fast, in-memory on small data)
  let matchingFormulaEntries: IndexEntry[];
  let matchingCaskEntries: IndexEntry[];

  if (searchText.length > 0) {
    const target = searchText.toLowerCase();

    // Filter formulae index by name, description, or aliases
    matchingFormulaEntries = formulaIndex.entries.filter((entry) => {
      return entry.n.includes(target) || entry.d?.includes(target) || entry.a?.some((alias) => alias.includes(target));
    });

    // Filter casks index by token or description
    matchingCaskEntries = caskIndex.entries.filter((entry) => {
      return entry.n.includes(target) || entry.d?.includes(target);
    });

    if (ranks) {
      matchingFormulaEntries.sort(byPopularity(ranks.formulae));
      matchingCaskEntries.sort(byPopularity(ranks.casks));
    } else {
      matchingFormulaEntries.sort((a, b) => brewCompare(a.id, b.id, target));
      matchingCaskEntries.sort((a, b) => brewCompare(a.id, b.id, target));
    }
  } else {
    // No search text - every entry, ordered by popularity or alphabetically
    matchingFormulaEntries = [...formulaIndex.entries];
    matchingCaskEntries = [...caskIndex.entries];

    if (ranks) {
      matchingFormulaEntries.sort(byPopularity(ranks.formulae));
      matchingCaskEntries.sort(byPopularity(ranks.casks));
    } else {
      matchingFormulaEntries.sort((a, b) => a.id.localeCompare(b.id));
      matchingCaskEntries.sort((a, b) => a.id.localeCompare(b.id));
    }
  }

  // Track total counts before slicing
  const formulaeLen = matchingFormulaEntries.length;
  const casksLen = matchingCaskEntries.length;

  // Phase 3: Slice BEFORE loading chunks (key optimization)
  // The window starts at `offset`, so paging forward DROPS the previous page
  // rather than appending to it — see the `offset` note above.
  const limitedFormulaEntries = limit
    ? matchingFormulaEntries.slice(offset, offset + limit)
    : matchingFormulaEntries.slice(offset);
  const limitedCaskEntries = limit
    ? matchingCaskEntries.slice(offset, offset + limit)
    : matchingCaskEntries.slice(offset);

  // Phase 4: Load only needed chunks
  const [formulae, casks] = await Promise.all([
    fetchFormulaItems(limitedFormulaEntries),
    fetchCaskItems(limitedCaskEntries),
  ]);

  // Check for abort after loading chunks
  if (signal?.aborted) {
    const error = new Error("Aborted");
    error.name = "AbortError";
    throw error;
  }

  // Stamp install counts onto the results so the UI can show why this order.
  if (ranks) {
    for (const formula of formulae) {
      formula.installs = ranks.formulae.get(formula.name);
    }
    for (const cask of casks) {
      cask.installs = ranks.casks.get(cask.token);
    }
  }

  // `totalLength` drives "X of Y results" in-process; `totals` below is the
  // same numbers in a form that survives being cached (see InstallableResults).
  (formulae as Formula[] & { totalLength?: number }).totalLength = formulaeLen;
  (casks as Cask[] & { totalLength?: number }).totalLength = casksLen;

  searchLogger.log("Search completed", {
    query: searchText,
    offset,
    formulaeResults: formulae.length,
    casksResults: casks.length,
    totalFormulae: formulaeLen,
    totalCasks: casksLen,
    truncated: formulae.length < formulaeLen || casks.length < casksLen,
  });

  // Report final progress with total counts
  onProgress?.({
    phase: "complete",
    formulaeProgress: formulaeProgress ? { ...formulaeProgress, totalItems: formulaeLen } : undefined,
    casksProgress: casksProgress ? { ...casksProgress, totalItems: casksLen } : undefined,
  });

  return { formulae, casks, totals: { formulae: formulaeLen, casks: casksLen } };
}

/**
 * The outcome of {@link brewFindPackage}.
 *
 * `missing` and `unavailable` are kept apart because they mean opposite things
 * to the user: one says brew has no such package, the other says we cannot
 * answer yet.
 */
export type FindPackageResult =
  | { status: "found"; package: Formula | Cask }
  /** The indexes were readable and neither had the name — including a tap-only package. */
  | { status: "missing" }
  /** No valid index on disk yet, so nothing was looked up. */
  | { status: "unavailable" };

/**
 * Find one package by its exact name or token.
 *
 * For callers that hold a bare name — a `brew install --dry-run` plan lists
 * dependencies by name only — and need the record behind it. Formulae are
 * checked first, since a name that is both is the formula in brew's own
 * resolution order.
 *
 * Strictly a READ of what is already cached: `cachedFormulaIndex` /
 * `cachedCaskIndex` return the in-memory or on-disk index and nothing else, so
 * a cold or schema-stale cache yields `unavailable` rather than kicking off the
 * full chunked-cache build (and, on the warm path, the background rebuild) that
 * `fetchFormulaIndex` would. That build is what the sliding-window memory
 * budget exists to avoid, and this lookup is worth one index read plus one
 * chunk read or nothing at all.
 *
 * Cost when it does run: the two indexes (already on disk after any search)
 * plus ONE chunk read for the match. Nothing is fetched on a miss, and a
 * package that lives only in a tap is a miss: the indexes cover the core taps
 * alone.
 */
export async function brewFindPackage(name: string): Promise<FindPackageResult> {
  const target = name.toLowerCase();
  const [formulaIndex, caskIndex] = await Promise.all([cachedFormulaIndex(), cachedCaskIndex()]);

  if (!formulaIndex || !caskIndex) {
    searchLogger.log("No cached index for lookup", { name });
    return { status: "unavailable" };
  }

  // An index entry promises a chunk read will produce the record, but a chunk
  // written by an older build — or half-written, or since pruned — can hand
  // back nothing. Reporting that as "found" with no package let `isCask()`
  // throw a TypeError, which surfaced as a misleading "Lookup failed".
  // The indexes and chunks disagree, which is "cannot answer", not "not there".
  const formulaEntry = formulaIndex.entries.find((entry) => entry.n === target || entry.a?.includes(target));
  if (formulaEntry) {
    const formula = (await fetchFormulaItems([formulaEntry]))[0];
    if (!formula) {
      searchLogger.log("Index entry with no chunk record", { name, kind: "formula" });
      return { status: "unavailable" };
    }
    return { status: "found", package: formula };
  }

  const caskEntry = caskIndex.entries.find((entry) => entry.n === target);
  if (caskEntry) {
    const cask = (await fetchCaskItems([caskEntry]))[0];
    if (!cask) {
      searchLogger.log("Index entry with no chunk record", { name, kind: "cask" });
      return { status: "unavailable" };
    }
    return { status: "found", package: cask };
  }

  searchLogger.log("Package not found in index", { name });
  return { status: "missing" };
}
