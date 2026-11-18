import { getMyIssues } from "../services/issues";

import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { usePaginatedResource } from "./usePaginatedResource";

type UseIssuesOptions = {
  includeCreated: boolean;
  includeAssigned: boolean;
  includeMentioned: boolean;
  includeRecentlyClosed: boolean;
  query?: string;
};

export function useIssues(options: UseIssuesOptions) {
  return usePaginatedResource({
    cacheKey: CacheKey.Issues,
    errorTitle: "Couldn't retrieve issues",
    pageSize: DEFAULT_PAGE_SIZE,
    params: options,
    fetchPage: getMyIssues,
    getItemKey: (issue) => issue.id,
  });
}
