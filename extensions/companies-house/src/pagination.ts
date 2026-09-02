import { PAGE_SIZE, SEARCH_INDEX_LIMIT } from "./constants";

/**
 * Enough pages to cover any register a caller is realistically browsing,
 * without letting a company with thousands of historic entries hang the
 * command or burn through the rate limit.
 */
export const MAX_PAGES = 10;

type PagedItems<T> = {
  items?: T[];
  total_results?: number;
};

export type FetchAllPagesResult<T, R extends PagedItems<T> = PagedItems<T>> = {
  items: T[];
  total: number;
  complete: boolean;
  firstPage?: R;
};

/** Reads every page of a register up to {@link MAX_PAGES}, reporting whether the full total was reached. */
export async function fetchAllPages<T, R extends PagedItems<T>>(
  fetchPage: (startIndex: number) => Promise<R>,
  maxPages = MAX_PAGES,
): Promise<FetchAllPagesResult<T, R>> {
  const items: T[] = [];
  let startIndex = 0;
  let total: number | undefined;
  let firstPage: R | undefined;

  for (let page = 0; page < maxPages; page++) {
    const res = await fetchPage(startIndex);
    if (page === 0) firstPage = res;
    const pageItems = res.items ?? [];
    items.push(...pageItems);
    total ??= res.total_results;
    startIndex += pageItems.length;
    if (pageItems.length === 0 || items.length >= (total ?? items.length))
      break;
  }

  return {
    items,
    total: total ?? items.length,
    complete: items.length >= (total ?? items.length),
    firstPage,
  };
}

/** Shape Raycast's paginated `useCachedPromise` expects for search commands. */
export function searchPageResult<T>(
  startIndex: number,
  items: T[],
  totalResults?: number,
): { data: T[]; hasMore: boolean } {
  const total = totalResults ?? items.length;
  const next = startIndex + items.length;
  return {
    data: items,
    hasMore: next < total && next < SEARCH_INDEX_LIMIT,
  };
}

/** Builds the paginated fetcher both search commands share. */
export function createSearchFetcher<T>(
  search: (
    query: string,
    startIndex: number,
  ) => Promise<{ items?: T[]; total_results?: number }>,
) {
  return (query: string) => async (options: { page: number }) => {
    if (!query.trim()) return { data: [], hasMore: false };
    const startIndex = options.page * PAGE_SIZE;
    const res = await search(query.trim(), startIndex);
    return searchPageResult(startIndex, res.items ?? [], res.total_results);
  };
}
