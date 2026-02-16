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
 * @returns Matching formulae and casks
 */
export async function brewSearch(
  searchText: string,
  limit?: number,
  signal?: AbortSignal,
  onProgress?: SearchProgressCallback,
): Promise<InstallableResults> {
  searchLogger.log("Searching", { query: searchText, limit });

  // Track progress for both downloads
  let casksProgress: DownloadProgress | undefined;
  let formulaeProgress: DownloadProgress | undefined;

  // Phase 1: Load indexes concurrently (small, ~600KB each)
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
    matchingFormulaEntries = formulaIndex.entries
      .filter((entry) => {
        return (
          entry.n.includes(target) || entry.d?.includes(target) || entry.a?.some((alias) => alias.includes(target))
        );
      })
      .sort((a, b) => brewCompare(a.id, b.id, target));

    // Filter casks index by token or description
    matchingCaskEntries = caskIndex.entries
      .filter((entry) => {
        return entry.n.includes(target) || entry.d?.includes(target);
      })
      .sort((a, b) => brewCompare(a.id, b.id, target));
  } else {
    // No search text - return all entries (sorted alphabetically)
    matchingFormulaEntries = [...formulaIndex.entries].sort((a, b) => a.id.localeCompare(b.id));
    matchingCaskEntries = [...caskIndex.entries].sort((a, b) => a.id.localeCompare(b.id));
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
