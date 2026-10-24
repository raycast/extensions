import { searchCapturePage } from "../coast";
import { captureEvidence } from "../evidence";
import type { SearchPage } from "../tool-contracts";

type Input = {
  /**
   * Full-text search query. Supports FTS5 syntax: AND, OR, NOT, "exact phrase", prefix*, and parentheses.
   */
  query: string;
  /**
   * Optional date or datetime range. Examples: 2026-09-09, 2026-09-09T09:00|2026-09-09T10:00, since:2026-09-01. Resolve relative dates before calling.
   */
  tr?: string;
  /**
   * Application bundle IDs to include. Get valid values from list-coast-filters when needed.
   */
  appFilters?: string[];
  /**
   * Web domains to include. Get valid values from list-coast-filters when needed.
   */
  domainFilters?: string[];
  /**
   * Maximum results in this page. Defaults to 20 and is capped at 200.
   */
  limit?: number;
  /** Zero-based result offset returned by a previous page. */
  offset?: number;
};

/**
 * Search the user's private local Coast history for moments containing specific words or phrases. Use for "where did I see this?" and content recall.
 */
export default async function tool(input: Input): Promise<SearchPage> {
  const page = await searchCapturePage(input);
  return {
    result_count: page.results.length,
    results: page.results.map((capture) => captureEvidence(capture)),
    pagination: page.pagination,
    scope: page.scope,
    next_input: page.next_input,
    coverage: page.coverage,
  };
}
