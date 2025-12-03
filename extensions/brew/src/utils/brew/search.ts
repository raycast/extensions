/**
 * Homebrew search utilities.
 *
 * Provides functions for searching formulae and casks.
 */

import { Cask, Formula, InstallableResults } from "../types";
import { searchLogger } from "../logger";
import { brewFetchFormulae, brewFetchCasks } from "./fetch";
import { brewCompare } from "./helpers";

// Store the query so that text entered during the initial fetch is respected.
let searchQuery: string | undefined;

/**
 * Search for packages matching the given text.
 *
 * @param searchText - The text to search for
 * @param limit - Maximum number of results per category
 * @param signal - AbortSignal for cancellation
 * @returns Matching formulae and casks
 */
export async function brewSearch(
  searchText: string,
  limit?: number,
  signal?: AbortSignal,
): Promise<InstallableResults> {
  searchLogger.log("Searching", { query: searchText, limit });
  searchQuery = searchText;

  let formulae = await brewFetchFormulae();

  if (signal?.aborted) {
    const error = new Error("Aborted");
    error.name = "AbortError";
    throw error;
  }

  let casks = await brewFetchCasks();

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

  return { formulae: formulae, casks: casks };
}
