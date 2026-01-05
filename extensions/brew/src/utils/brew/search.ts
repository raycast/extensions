/**
 * Homebrew search utilities.
 *
 * Provides functions for searching formulae and casks.
 */

import { Cask, Formula, InstallableResults, DownloadProgress } from "../types";
import { searchLogger } from "../logger";
import { brewFetchFormulae, brewFetchCasks } from "./fetch";
import { brewCompare } from "./helpers";

// Store the query so that text entered during the initial fetch is respected.
let searchQuery: string | undefined;

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
  searchQuery = searchText;

  // Track progress for both downloads
  let casksProgress: DownloadProgress | undefined;
  let formulaeProgress: DownloadProgress | undefined;

  // Download casks first (they have descriptions and are shown first in the UI)
  onProgress?.({ phase: "casks" });

  let casks = await brewFetchCasks((progress) => {
    casksProgress = progress;
    onProgress?.({
      phase: "casks",
      casksProgress: progress,
      formulaeProgress,
    });
  });

  if (signal?.aborted) {
    const error = new Error("Aborted");
    error.name = "AbortError";
    throw error;
  }

  onProgress?.({ phase: "formulae", casksProgress, formulaeProgress });

  let formulae = await brewFetchFormulae((progress) => {
    formulaeProgress = progress;
    onProgress?.({
      phase: "formulae",
      casksProgress,
      formulaeProgress: progress,
    });
  });

  if (signal?.aborted) {
    const error = new Error("Aborted");
    error.name = "AbortError";
    throw error;
  }

  if (searchQuery.length > 0) {
    const target = searchQuery.toLowerCase();
    formulae = formulae
      ?.filter((formula: Formula) => {
        return formula.name.toLowerCase().includes(target) || formula.desc?.toLowerCase().includes(target);
      })
      .sort((lhs: Formula, rhs: Formula) => {
        return brewCompare(lhs.name, rhs.name, target);
      });

    casks = casks
      ?.filter((cask: Cask) => {
        return (
          cask.token.toLowerCase().includes(target) ||
          cask.name.some((name: string) => name.toLowerCase().includes(target)) ||
          cask.desc?.toLowerCase().includes(target)
        );
      })
      .sort((lhs: Cask, rhs: Cask) => {
        return brewCompare(lhs.token, rhs.token, target);
      });
  }

  const formulaeLen = formulae.length;
  const casksLen = casks.length;

  if (limit) {
    formulae = formulae.slice(0, limit);
    casks = casks.slice(0, limit);
  }

  formulae.totalLength = formulaeLen;
  casks.totalLength = casksLen;

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

  return { formulae: formulae, casks: casks };
}
