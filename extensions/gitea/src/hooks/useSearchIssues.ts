import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { searchIssues, type SearchIssuesParams } from "../services/issues";
import { usePaginatedResource } from "./usePaginatedResource";

export type UseSearchIssuesParams = Omit<SearchIssuesParams, "page" | "limit">;

export function useSearchIssues(params: UseSearchIssuesParams) {
  return usePaginatedResource({
    cacheKey: CacheKey.IssueSearch,
    errorTitle: "Couldn't search issues",
    pageSize: DEFAULT_PAGE_SIZE,
    params,
    fetchPage: searchIssues,
  });
}
