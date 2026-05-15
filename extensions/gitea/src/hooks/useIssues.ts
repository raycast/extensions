import { getMyIssues } from "../api/issues";

import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { usePaginatedCachedPromise } from "./usePaginatedCachedPromise";

type UseIssuesOptions = {
  includeCreated: boolean;
  includeAssigned: boolean;
  includeMentioned: boolean;
  includeRecentlyClosed: boolean;
  query?: string;
};

export function useIssues(options: UseIssuesOptions) {
  return usePaginatedCachedPromise({
    cacheKey: CacheKey.Issues,
    errorTitle: "Couldn't retrieve issues",
    pageSize: DEFAULT_PAGE_SIZE,
    args: [
      options.includeCreated,
      options.includeAssigned,
      options.includeMentioned,
      options.includeRecentlyClosed,
      options.query,
    ] as [boolean, boolean, boolean, boolean, string | undefined],
    fetchPage: (page, includeCreated, includeAssigned, includeMentioned, includeRecentlyClosed, query) =>
      getMyIssues({
        includeCreated,
        includeAssigned,
        includeMentioned,
        includeRecentlyClosed,
        query,
        page,
        limit: DEFAULT_PAGE_SIZE,
      }),
  });
}
