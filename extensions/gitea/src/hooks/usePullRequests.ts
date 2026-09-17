import { getMyPullRequests } from "../services/pull-requests";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { usePaginatedResource } from "./usePaginatedResource";

type UsePullRequestsOptions = {
  includeCreated: boolean;
  includeAssigned: boolean;
  includeMentioned: boolean;
  includeReviewRequested: boolean;
  includeReviewed: boolean;
  includeOwnedRepositories: boolean;
  includeAccessibleRepositories: boolean;
  includeRecentlyClosed: boolean;
  owner?: string;
  query?: string;
};

export function usePullRequests(options: UsePullRequestsOptions) {
  return usePaginatedResource({
    cacheKey: CacheKey.PullRequests,
    errorTitle: "Couldn't retrieve pull requests",
    pageSize: DEFAULT_PAGE_SIZE,
    params: options,
    fetchPage: getMyPullRequests,
    getItemKey: (pullRequest) => pullRequest.id,
  });
}
