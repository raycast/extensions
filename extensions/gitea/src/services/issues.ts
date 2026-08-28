import { PaginatedResult } from ".";
import { api } from "../api";
import type { CreateIssueParams, IssueListParams } from "../api/issues";
import type { Issue, Label, Milestone, User } from "../types/api";

export type MyIssuesParams = {
  includeCreated: boolean;
  includeAssigned: boolean;
  includeMentioned: boolean;
  includeRecentlyClosed: boolean;
  query?: string;
  page?: number;
  limit?: number;
};

export type SearchIssuesParams = {
  query?: string;
  state?: IssueListParams["state"];
  owner?: string;
  repo?: string;
  page?: number;
  limit?: number;
};

export type CreateIssueMetadataParams = {
  owner?: string;
  repo?: string;
};

export type CreateIssueMetadataFailure = {
  field: "labels" | "milestones" | "assignees";
  reason: unknown;
};

export type CreateIssueMetadata = {
  labels: Label[];
  milestones: Milestone[];
  assignees: User[];
  metadataFailures: CreateIssueMetadataFailure[];
};

type IssueSearchRequest = {
  enabled: boolean;
  params: IssueListParams;
};

export async function getMyIssues(params: MyIssuesParams): Promise<PaginatedResult<Issue>> {
  const q = params.query?.trim() ? params.query.trim() : undefined;
  const baseQuery = {
    type: "issues",
    q,
    page: params.page,
    limit: params.limit,
  } satisfies IssueListParams;

  if (!params.includeCreated && !params.includeAssigned && !params.includeMentioned) {
    return { items: [], hasMore: false };
  }

  const state = params.includeRecentlyClosed ? "all" : "open";
  return searchEnabledIssueRequests(
    [
      { enabled: params.includeCreated, params: { ...baseQuery, state, created: true } },
      { enabled: params.includeAssigned, params: { ...baseQuery, state, assigned: true } },
      { enabled: params.includeMentioned, params: { ...baseQuery, state, mentioned: true } },
    ],
    params.limit,
  );
}

export async function searchIssues(params: SearchIssuesParams): Promise<PaginatedResult<Issue>> {
  if (params.owner && params.repo) {
    const data = await api.issues.listRepo({
      owner: params.owner,
      repo: params.repo,
      state: params.state,
      type: "issues",
      q: params.query?.trim() ? params.query.trim() : undefined,
      page: params.page,
      limit: params.limit,
    });

    return {
      items: data,
      hasMore: params.limit != null && data.length === params.limit,
    };
  }

  const data = await api.issues.search({
    type: "issues",
    state: params.state,
    q: params.query?.trim() ? params.query.trim() : undefined,
    owner: params.owner,
    page: params.page,
    limit: params.limit,
  });

  const items = params.repo
    ? data.filter(
        (issue) =>
          issue.repository?.full_name === getRepositoryFullName(params) || issue.repository?.name === params.repo,
      )
    : data;

  return {
    items,
    hasMore: params.limit != null && data.length === params.limit,
  };
}

export async function getCreateIssueMetadata({ owner, repo }: CreateIssueMetadataParams): Promise<CreateIssueMetadata> {
  if (!owner || !repo) {
    return { labels: [], milestones: [], assignees: [], metadataFailures: [] };
  }

  const [labels, milestones, assignees] = await Promise.allSettled([
    api.issues.listLabels({ owner, repo }),
    api.issues.listMilestones({ owner, repo, state: "open" }),
    api.issues.listAssignees({ owner, repo }),
  ]);

  return {
    labels: labels.status === "fulfilled" ? labels.value : [],
    milestones: milestones.status === "fulfilled" ? milestones.value : [],
    assignees: assignees.status === "fulfilled" ? assignees.value : [],
    metadataFailures: [
      ...(labels.status === "rejected" ? [{ field: "labels" as const, reason: labels.reason }] : []),
      ...(milestones.status === "rejected" ? [{ field: "milestones" as const, reason: milestones.reason }] : []),
      ...(assignees.status === "rejected" ? [{ field: "assignees" as const, reason: assignees.reason }] : []),
    ],
  };
}

export async function createIssue(params: CreateIssueParams): Promise<Issue> {
  return api.issues.create(params);
}

export async function searchEnabledIssueRequests(
  requests: IssueSearchRequest[],
  limit?: number,
): Promise<PaginatedResult<Issue>> {
  const enabledRequests = requests.filter((request) => request.enabled);
  if (enabledRequests.length === 0) {
    return { items: [], hasMore: false };
  }

  const pages = await Promise.all(enabledRequests.map((request) => api.issues.search(request.params)));
  return {
    items: sortIssuesByStateAndUpdate(dedupeIssuesById(pages.flat())),
    hasMore: limit != null && pages.some((page) => page.length === limit),
  };
}

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

function getRepositoryFullName(params: SearchIssuesParams): string | undefined {
  return params.owner && params.repo ? `${params.owner}/${params.repo}` : undefined;
}

function sortIssuesByStateAndUpdate(items: Issue[]): Issue[] {
  const stateRank = (state?: string) => (state?.toLowerCase() === "open" ? 0 : 1);
  const timeValue = (value?: string) => {
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  };

  return [...items].sort((a, b) => {
    const byState = stateRank(a.state) - stateRank(b.state);
    if (byState !== 0) return byState;
    return timeValue(b.updated_at) - timeValue(a.updated_at);
  });
}
