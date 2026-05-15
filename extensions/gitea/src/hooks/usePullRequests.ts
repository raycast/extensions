import { getMyPullRequests } from "../api/issues";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { usePaginatedCachedPromise } from "./usePaginatedCachedPromise";

type UsePullRequestsOptions = {
  includeCreated: boolean;
  includeAssigned: boolean;
  includeMentioned: boolean;
  includeReviewRequested: boolean;
  includeReviewed: boolean;
  includeOwnedRepositories: boolean;
  includeRecentlyClosed: boolean;
  owner?: string;
  query?: string;
};

export function usePullRequests(options: UsePullRequestsOptions) {
  return usePaginatedCachedPromise({
    cacheKey: CacheKey.PullRequests,
    errorTitle: "Couldn't retrieve pull requests",
    pageSize: DEFAULT_PAGE_SIZE,
    args: [
      options.includeCreated,
      options.includeAssigned,
      options.includeMentioned,
      options.includeReviewRequested,
      options.includeReviewed,
      options.includeOwnedRepositories,
      options.includeRecentlyClosed,
      options.owner,
      options.query,
    ] as [boolean, boolean, boolean, boolean, boolean, boolean, boolean, string | undefined, string | undefined],
    fetchPage: (
      page,
      includeCreated,
      includeAssigned,
      includeMentioned,
      includeReviewRequested,
      includeReviewed,
      includeOwnedRepositories,
      includeRecentlyClosed,
      owner,
      query,
    ) =>
      getMyPullRequests({
        includeCreated,
        includeAssigned,
        includeMentioned,
        includeReviewRequested,
        includeReviewed,
        includeOwnedRepositories,
        includeRecentlyClosed,
        owner,
        query,
        page,
        limit: DEFAULT_PAGE_SIZE,
      }),
  });
}
