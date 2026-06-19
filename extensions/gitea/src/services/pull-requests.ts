import type { PaginatedResult } from ".";
import type { Issue } from "../types/api";
import type { IssueListParams } from "../api/issues";
import { searchEnabledIssueRequests } from "./issues";

export type MyPullRequestsParams = {
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
  page?: number;
  limit?: number;
};

export async function getMyPullRequests(params: MyPullRequestsParams): Promise<PaginatedResult<Issue>> {
  const q = params.query?.trim() ? params.query.trim() : undefined;
  const baseQuery = {
    type: "pulls",
    q,
    page: params.page,
    limit: params.limit,
  } satisfies IssueListParams;

  if (
    !params.includeCreated &&
    !params.includeAssigned &&
    !params.includeMentioned &&
    !params.includeReviewRequested &&
    !params.includeReviewed &&
    !params.includeOwnedRepositories &&
    !params.includeAccessibleRepositories
  ) {
    return { items: [], hasMore: false };
  }

  const state = params.includeRecentlyClosed ? "all" : "open";
  return searchEnabledIssueRequests(
    [
      { enabled: params.includeCreated, params: { ...baseQuery, state, created: true } },
      { enabled: params.includeAssigned, params: { ...baseQuery, state, assigned: true } },
      { enabled: params.includeMentioned, params: { ...baseQuery, state, mentioned: true } },
      { enabled: params.includeReviewRequested, params: { ...baseQuery, state, review_requested: true } },
      { enabled: params.includeReviewed, params: { ...baseQuery, state, reviewed: true } },
      {
        enabled: params.includeOwnedRepositories && Boolean(params.owner),
        params: { ...baseQuery, state, owner: params.owner },
      },
      { enabled: params.includeAccessibleRepositories, params: { ...baseQuery, state } },
    ],
    params.limit,
  );
}
