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
import { fetchFormulaIndex, fetchCaskIndex, fetchFormulaItems, fetchCaskItems } from "./fetch";
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
 * @returns Matching formulae and casks
 */
export async function brewSearch(
  searchText: string,
  limit?: number,
  signal?: AbortSignal,
  onProgress?: SearchProgressCallback,
  ranks?: PopularityRanks,
): Promise<InstallableResults> {
  searchLogger.log("Searching", { query: searchText, limit, sortByPopularity: ranks != undefined });

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
  const limitedFormulaEntries = limit ? matchingFormulaEntries.slice(0, limit) : matchingFormulaEntries;
  const limitedCaskEntries = limit ? matchingCaskEntries.slice(0, limit) : matchingCaskEntries;

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

  // Set totalLength for UI (shows "X of Y results")
  (formulae as Formula[] & { totalLength?: number }).totalLength = formulaeLen;
  (casks as Cask[] & { totalLength?: number }).totalLength = casksLen;

  searchLogger.log("Search completed", {
    query: searchText,
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

  return { formulae, casks };
}
