import { sourcegraphDotCom } from "../sourcegraph";
import { executeDiffSearch, formatSearchResults } from "./shared/search";

type Input = {
  /**
   * Search query for code changes and diffs in public repositories. Can include repo:owner/name, file:, author:, and text to search within code changes and diffs.
   */
  query: string;
  /**
   * Maximum number of results to return. Defaults to 20.
   */
  maxResults?: number;
};

/**
 * Search through code changes and diffs across public repositories on Sourcegraph.com.
 * This tool searches the actual content of code changes (additions, deletions, modifications) in open source projects.
 * Use when you need to find specific code changes, bug fixes, or see how code evolved over time in public repositories.
 */
export default async function tool(params: Input) {
  const { query, maxResults = 20 } = params;
  // Create Sourcegraph client for public code search
  const src = await sourcegraphDotCom();

  // Perform the diff search
  const results = await executeDiffSearch(src, query, maxResults);

  // Format results for AI consumption
  return formatSearchResults(results, src);
}
