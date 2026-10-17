import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { MutableRefObject } from "react";
import { APP_MAX_LISTENERS } from "./constants";
import { PaginationOptions } from "./pagination";
import { withPagination } from "./schema";

type SearchResponse<T> = {
  status: number;
  body: T[];
  headers: Headers;
};

type SearchQuery = {
  query: string;
  page: number;
  limit: 10;
  fields: "title";
  extended: "full,cloud9";
};

type SearchEndpoint<T> = (args: {
  query: SearchQuery;
  fetchOptions: { signal: AbortSignal };
}) => Promise<SearchResponse<T>>;

type CreateSearchFetcherOptions<T> = {
  abortable: MutableRefObject<AbortController | undefined>;
  delay?: number;
  search: SearchEndpoint<T>;
};

export function createSearchFetcher<T>({ abortable, delay = 100, search }: CreateSearchFetcherOptions<T>) {
  return (searchText: string) => async (options: PaginationOptions) => {
    if (!searchText) return { data: [], hasMore: false };
    await setTimeout(delay);

    abortable.current = new AbortController();
    setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

    const response = await search({
      query: {
        query: searchText,
        page: options.page + 1,
        limit: 10,
        fields: "title",
        extended: "full,cloud9",
      },
      fetchOptions: {
        signal: abortable.current.signal,
      },
    });

    if (response.status !== 200) return { data: [], hasMore: false };
    const paginatedResponse = withPagination(response);

    return {
      data: paginatedResponse.data,
      hasMore:
        paginatedResponse.pagination["x-pagination-page"] < paginatedResponse.pagination["x-pagination-page-count"],
    };
  };
}

export function abortSearch(
  abortable: MutableRefObject<AbortController | undefined>,
  setSearchText: (text: string) => void,
) {
  return (text: string): void => {
    abortable.current?.abort();
    abortable.current = new AbortController();
    setSearchText(text);
  };
}
