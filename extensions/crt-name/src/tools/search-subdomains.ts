import { searchApex, SubdomainRecord } from "../api";

type SortOrder = "first-seen-ascending" | "first-seen-descending" | "alphabetical";

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
  const contains = input.contains?.trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, input.limit ?? 25));
  const matchingResults = contains
    ? results.filter((result) => result.subdomain.toLowerCase().includes(contains))
    : results;
  const sortedResults = [...matchingResults].sort(sorter(input.sort ?? "first-seen-ascending"));
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

function sorter(sort: SortOrder): (left: SubdomainRecord, right: SubdomainRecord) => number {
  if (sort === "alphabetical") {
    return (left, right) => left.subdomain.localeCompare(right.subdomain);
  }

  const direction = sort === "first-seen-descending" ? -1 : 1;
  return (left, right) => {
    if (!left.firstSeen && !right.firstSeen) return left.subdomain.localeCompare(right.subdomain);
    if (!left.firstSeen) return 1;
    if (!right.firstSeen) return -1;

    return direction * left.firstSeen.localeCompare(right.firstSeen) || left.subdomain.localeCompare(right.subdomain);
  };
}
