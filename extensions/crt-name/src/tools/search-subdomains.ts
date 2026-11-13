import { searchApex } from "../api";
import { filterSubdomains, sortSubdomains, SortOrder, SubdomainRecord } from "../subdomains";

type Input = {
  /**
   * Apex domain (eTLD+1) to search, such as example.com. A URL containing an apex domain is also accepted.
   */
  apex: string;
  /**
   * Optional case-insensitive text that must appear in each returned subdomain, such as login, api, or staging.
   */
  contains?: string;
  /**
   * Result order. Defaults to first-seen-ascending, which returns the oldest indexed names first.
   */
  sort?: SortOrder;
  /**
   * Maximum number of subdomains to return, from 1 to 100. Defaults to 25.
   */
  limit?: number;
};

type ToolResult = {
  apex: string;
  totalIndexed: number;
  matchingCount: number;
  returnedCount: number;
  truncated: boolean;
  results: SubdomainRecord[];
};

/**
 * Search crt.name's passive index for subdomains and their first-seen dates. This tool is read-only and does not check whether hosts are currently reachable.
 */
export default async function searchSubdomains(input: Input): Promise<ToolResult> {
  const { apex, results } = await searchApex(input.apex);
  const limit = Math.min(100, Math.max(1, input.limit ?? 25));
  const matchingResults = filterSubdomains(results, input.contains ?? "");
  const sortedResults = sortSubdomains(matchingResults, input.sort ?? "first-seen-ascending");
  const returnedResults = sortedResults.slice(0, limit);

  return {
    apex,
    totalIndexed: results.length,
    matchingCount: matchingResults.length,
    returnedCount: returnedResults.length,
    truncated: returnedResults.length < matchingResults.length,
    results: returnedResults,
  };
}
