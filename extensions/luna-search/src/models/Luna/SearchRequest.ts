import { BASE_REQUEST, DEFAULT_HEADERS, DEFAULT_TIMEOUT_S, SEARCH_PAGE_TYPE } from "./constants";
import { Request } from "./Request";
import { LunaResponse } from "./Reponse";

/**
 * The sort order for the search query. Currently, only "RELEVANCE" is supported.
 */
type SearchSortOrder = "RELEVANCE";

/**
 * The default sort order for the search query.
 */
const SEARCH_DEFAULT_SORT_ORDER = "RELEVANCE";

/**
 * The indicator used to determine if the search query returned no results.
 */
const EMPTY_INDICATOR = "empty";

/**
 * Represents the context for the search query, including the query string and the sort order.
 */
interface SearchContext {
  query: string;
  sort: SearchSortOrder;
}

/**
 * Represents the body of the search request, which extends the base request.
 */
interface SearchBody extends Request {
  searchContext: SearchContext;
}

/**
 * Encapsulates the logic for creating a search request to the Luna API.
 * The request includes the search query, a timeout (defaulting to 3 seconds),
 * and sets the page type to the SEARCH_PAGE_TYPE constant.
 */
export class SearchRequest {
  readonly headers: Record<string, string>;
  readonly body: SearchBody;

  constructor(readonly query: string, readonly timeout: number = DEFAULT_TIMEOUT_S) {
    this.headers = DEFAULT_HEADERS;
    // Trim query to 1000 for safety:
    const safeQuery = query.substring(0, 1000);
    const body: SearchBody = {
      ...BASE_REQUEST,
      searchContext: {
        query: safeQuery,
        sort: SEARCH_DEFAULT_SORT_ORDER,
      },
      timeout,
    };
    body.pageContext.pageType = SEARCH_PAGE_TYPE;
    this.body = body;
  }
}

/**
 * Checks if the provided search response indicates that the search query returned no results.
 * This is determined by checking if the pageContext.pageType includes the EMPTY_INDICATOR.
 *
 * @param res The search response to check.
 * @returns True if the search returned no results, false otherwise.
 */
export function isEmpty(res: LunaResponse): boolean {
  return res.pageContext.pageType.includes(EMPTY_INDICATOR);
}
