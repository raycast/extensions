import { listSavedSearches, runSavedSearch } from "../saved";
import { captureEvidence } from "../evidence";
import { pageItems } from "../pagination";
import type { PrefixPagination } from "../pagination";
import type { CaptureEvidence } from "../tool-contracts";
import type { SavedSearch } from "../saved";
import type { SearchArgs } from "../coast";
type Output = {
  searches?: SavedSearch[];
  scope?: SearchArgs;
  selection?: string;
  results?: CaptureEvidence[];
  pagination: PrefixPagination;
  coverage: string;
  next_input?: { id: string; tr?: string; limit: number; offset: number };
};
type Input = {
  /** Omit to list saved filter definitions. Provide an ID from that list to run a saved search against current Coast history. */
  id?: string;
  /** Maximum definitions or results in this page. Defaults to 50 and is capped at 200. */
  limit?: number;
  /** Zero-based definition or result offset returned by a previous page. */
  offset?: number;
  /** Reuse scope.tr from the previous result to preserve its resolved date range across continuation. Omit on the initial run to resolve the saved rolling range. */
  tr?: string;
};
/** List or execute explicitly saved Coast search filters. Use only when the user refers to saved searches, not to continue an ordinary search: use search-captures with its offset for that. Read-only: never creates, edits, or deletes saved searches. */
export default async function tool(input: Input): Promise<Output> {
  const searches = await listSavedSearches();
  if (!input.id) {
    const page = pageItems(searches, input);
    return {
      searches: page.items,
      pagination: page.pagination,
      coverage:
        "Pagination covers every locally saved search definition currently stored.",
    };
  }
  const search = searches.find((item) => item.id === input.id);
  if (!search) throw new Error("Saved search not found. List searches first.");
  const result = await runSavedSearch(search, input);
  return {
    scope: result.scope,
    selection: search.query ? "search-results" : "representative",
    results: result.frames.map((frame) => captureEvidence(frame)),
    pagination: result.pagination,
    next_input: result.pagination.has_more
      ? {
          id: input.id,
          tr: result.scope.tr,
          limit: result.pagination.limit,
          offset: result.pagination.next_offset!,
        }
      : undefined,
    coverage: result.coverage,
  };
}
