import { getClient } from "./client";
import type { Issue, Label, Milestone, User } from "../types/api";
import { PaginatedResult } from "./common";

export type IssueListParams = {
  state?: "open" | "closed" | "all";
  labels?: string;
  milestones?: string;
  q?: string;
  priority_repo_id?: number;
  type?: "issues" | "pulls";
  since?: string;
  before?: string;
  assigned?: boolean;
  created?: boolean;
  mentioned?: boolean;
  review_requested?: boolean;
  reviewed?: boolean;
  owner?: string;
  team?: string;
  page?: number;
  limit?: number;
};

export async function searchIssues(params: IssueListParams = {}): Promise<Issue[]> {
  const client = getClient();
  const { data } = await client.rest.issue.issueSearchIssues(params);
  return data;
}

export type ListRepoIssuesParams = {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  labels?: string;
  milestones?: string;
  q?: string;
  since?: string;
  before?: string;
  page?: number;
  limit?: number;
};

export async function listRepoIssues(params: ListRepoIssuesParams): Promise<Issue[]> {
  const client = getClient();
  const { data } = await client.rest.issue.issueListIssues(params);
  return data;
}

export type ListRepoLabelsParams = {
  owner: string;
  repo: string;
};

export async function listRepoLabels(params: ListRepoLabelsParams): Promise<Label[]> {
  const client = getClient();
  const { data } = await client.rest.issue.issueListLabels(params);
  return data;
}

export type ListRepoMilestonesParams = {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
};

export async function listRepoMilestones(params: ListRepoMilestonesParams): Promise<Milestone[]> {
  const client = getClient();
  const { data } = await client.rest.issue.issueGetMilestonesList({ ...params, state: params.state ?? "open" });
  return data;
}

export type ListRepoAssigneesParams = {
  owner: string;
  repo: string;
};

export async function listRepoAssignees(params: ListRepoAssigneesParams): Promise<User[]> {
  const client = getClient();
  const { data } = await client.rest.repository.repoGetAssignees(params);
  return data;
}

export type CreateIssueParams = {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: number[];
  milestone?: number;
  assignees?: string[];
  due_date?: string;
  ref?: string;
};

export async function createIssue(params: CreateIssueParams): Promise<Issue> {
  const client = getClient();
  const { owner, repo, ...body } = params;
  const { data } = await client.rest.issue.issueCreateIssue({
    owner,
    repo,
    body,
  });
  return data;
}

export type MyIssuesParams = {
  includeCreated: boolean;
  includeAssigned: boolean;
  includeMentioned: boolean;
  includeRecentlyClosed: boolean;
  query?: string;
  page?: number;
  limit?: number;
};

export type MyPullRequestsParams = {
  includeCreated: boolean;
  includeAssigned: boolean;
  includeMentioned: boolean;
  includeReviewRequested: boolean;
  includeReviewed: boolean;
  includeOwnedRepositories: boolean;
  includeRecentlyClosed: boolean;
  owner?: string;
  query?: string;
  page?: number;
  limit?: number;
};

type IssueSearchRequest = {
  enabled: boolean;
  params: IssueListParams;
};

export async function getMyIssues(params: MyIssuesParams): Promise<PaginatedResult<Issue>> {
  const baseQuery = {
    type: "issues",
    q: params.query,
    page: params.page,
    limit: params.limit,
  } satisfies IssueListParams;

  if (!params.includeCreated && !params.includeAssigned && !params.includeMentioned) {
    return { items: [], hasMore: false };
  }

  const state = params.includeRecentlyClosed ? "all" : "open";
  return searchEnabledRequests(
    [
      { enabled: params.includeCreated, params: { ...baseQuery, state, created: true } },
      { enabled: params.includeAssigned, params: { ...baseQuery, state, assigned: true } },
      { enabled: params.includeMentioned, params: { ...baseQuery, state, mentioned: true } },
    ],
    params.limit,
  );
}

export async function getMyPullRequests(params: MyPullRequestsParams): Promise<PaginatedResult<Issue>> {
  const baseQuery = {
    type: "pulls",
    q: params.query,
    page: params.page,
    limit: params.limit,
  } satisfies IssueListParams;

  if (
    !params.includeCreated &&
    !params.includeAssigned &&
    !params.includeMentioned &&
    !params.includeReviewRequested &&
    !params.includeReviewed &&
    !params.includeOwnedRepositories
  ) {
    return { items: [], hasMore: false };
  }

  const state = params.includeRecentlyClosed ? "all" : "open";
  return searchEnabledRequests(
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
    ],
    params.limit,
  );
}

// ================================================================
// Utility functions
// ================================================================

function dedupeIssuesById(items: Issue[]): Issue[] {
  const deduped = new Map<number, Issue>();
  const withoutId: Issue[] = [];

  for (const issue of items) {
    if (issue.id == null) {
      withoutId.push(issue);
      continue;
    }
    deduped.set(issue.id, issue);
  }

  return [...deduped.values(), ...withoutId];
}

async function searchEnabledRequests(requests: IssueSearchRequest[], limit?: number): Promise<PaginatedResult<Issue>> {
  const enabledRequests = requests.filter((request) => request.enabled);
  if (enabledRequests.length === 0) {
    return { items: [], hasMore: false };
  }

  const pages = await Promise.all(enabledRequests.map((request) => searchIssues(request.params)));
  return {
    items: dedupeIssuesById(pages.flat()),
    hasMore: limit != null && pages.some((page) => page.length === limit),
  };
}
