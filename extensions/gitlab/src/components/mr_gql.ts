import { gql } from "@apollo/client";
import { getGitLabGQL, gitlab } from "../common";
import { Group, Label, MergeRequest, Project, User } from "../gitlabapi";
import { getIdFromGqlId, projectFullPathFromWebUrl } from "../utils";
import { MRScope, MRState } from "./mr";
import { MROrderBy, MRSearchOrderBy } from "./mr_sort";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const MR_LIST_PAGE_SIZE = 20;

const MERGE_REQUEST_LIST_FIELDS = gql`
  fragment MergeRequestListFields on MergeRequest {
    id
    iid
    title
    state
    webUrl
    reference(full: true)
    createdAt
    updatedAt
    mergedAt
    closedAt
    conflicts
    autoMergeEnabled
    forceRemoveSourceBranch
    squashOnMerge
    sourceBranch
    targetBranch
    targetProjectId
    resolvedDiscussionsCount
    resolvableDiscussionsCount
    author {
      id
      name
      avatarUrl
      webUrl
    }
    assignees {
      nodes {
        id
        name
        avatarUrl
        webUrl
      }
    }
    reviewers {
      nodes {
        id
        name
        avatarUrl
        webUrl
      }
    }
    labels {
      nodes {
        id
        title
        color
      }
    }
    milestone {
      id
      title
    }
    headPipeline {
      id
      status
      detailedStatus {
        label
        name
      }
    }
    userPermissions {
      canMerge
      updateMergeRequest
    }
    approvedBy {
      nodes {
        username
      }
    }
    currentUserTodos(state: pending, first: 1) {
      nodes {
        id
      }
    }
    description
    project {
      webUrl
      fullPath
    }
  }
`;

const PROJECT_MERGE_REQUESTS = gql`
  ${MERGE_REQUEST_LIST_FIELDS}
  query ProjectMergeRequests(
    $fullPath: ID!
    $first: Int!
    $after: String
    $state: MergeRequestState
    $search: String
    $in: [IssuableSearchableField!]
    $sort: MergeRequestSort
    $labelName: [String]
    $authorUsername: String
    $assigneeUsername: String
    $assigneeUsernames: [String!]
    $reviewerUsername: String
    $milestoneTitle: String
    $targetBranches: [String!]
    $sourceBranches: [String!]
    $draft: Boolean
    $not: MergeRequestsResolverNegatedParams
  ) {
    project(fullPath: $fullPath) {
      mergeRequests(
        first: $first
        after: $after
        state: $state
        search: $search
        in: $in
        sort: $sort
        labelName: $labelName
        authorUsername: $authorUsername
        assigneeUsername: $assigneeUsername
        assigneeUsernames: $assigneeUsernames
        reviewerUsername: $reviewerUsername
        milestoneTitle: $milestoneTitle
        targetBranches: $targetBranches
        sourceBranches: $sourceBranches
        draft: $draft
        not: $not
      ) {
        nodes {
          ...MergeRequestListFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const GROUP_MERGE_REQUESTS = gql`
  ${MERGE_REQUEST_LIST_FIELDS}
  query GroupMergeRequests(
    $fullPath: ID!
    $first: Int!
    $after: String
    $state: MergeRequestState
    $search: String
    $in: [IssuableSearchableField!]
    $sort: MergeRequestSort
    $labelName: [String]
    $authorUsername: String
    $assigneeUsername: String
    $assigneeUsernames: [String!]
    $reviewerUsername: String
    $milestoneTitle: String
    $targetBranches: [String!]
    $sourceBranches: [String!]
    $draft: Boolean
    $not: MergeRequestsResolverNegatedParams
  ) {
    group(fullPath: $fullPath) {
      mergeRequests(
        first: $first
        after: $after
        state: $state
        search: $search
        in: $in
        sort: $sort
        labelName: $labelName
        authorUsername: $authorUsername
        assigneeUsername: $assigneeUsername
        assigneeUsernames: $assigneeUsernames
        reviewerUsername: $reviewerUsername
        milestoneTitle: $milestoneTitle
        targetBranches: $targetBranches
        sourceBranches: $sourceBranches
        draft: $draft
        not: $not
      ) {
        nodes {
          ...MergeRequestListFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const CURRENT_USER_ASSIGNED_MERGE_REQUESTS = gql`
  ${MERGE_REQUEST_LIST_FIELDS}
  query CurrentUserAssignedMergeRequests(
    $first: Int!
    $after: String
    $state: MergeRequestState
    $search: String
    $in: [IssuableSearchableField!]
    $sort: MergeRequestSort
    $labelName: [String]
    $milestoneTitle: String
    $targetBranches: [String!]
    $sourceBranches: [String!]
    $draft: Boolean
    $not: MergeRequestsResolverNegatedParams
    $includeArchived: Boolean
  ) {
    currentUser {
      assignedMergeRequests(
        first: $first
        after: $after
        state: $state
        search: $search
        in: $in
        sort: $sort
        labelName: $labelName
        milestoneTitle: $milestoneTitle
        targetBranches: $targetBranches
        sourceBranches: $sourceBranches
        draft: $draft
        not: $not
        includeArchived: $includeArchived
      ) {
        nodes {
          ...MergeRequestListFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const CURRENT_USER_AUTHORED_MERGE_REQUESTS = gql`
  ${MERGE_REQUEST_LIST_FIELDS}
  query CurrentUserAuthoredMergeRequests(
    $first: Int!
    $after: String
    $state: MergeRequestState
    $search: String
    $in: [IssuableSearchableField!]
    $sort: MergeRequestSort
    $labelName: [String]
    $milestoneTitle: String
    $targetBranches: [String!]
    $sourceBranches: [String!]
    $draft: Boolean
    $not: MergeRequestsResolverNegatedParams
    $includeArchived: Boolean
  ) {
    currentUser {
      authoredMergeRequests(
        first: $first
        after: $after
        state: $state
        search: $search
        in: $in
        sort: $sort
        labelName: $labelName
        milestoneTitle: $milestoneTitle
        targetBranches: $targetBranches
        sourceBranches: $sourceBranches
        draft: $draft
        not: $not
        includeArchived: $includeArchived
      ) {
        nodes {
          ...MergeRequestListFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const CURRENT_USER_REVIEW_MERGE_REQUESTS = gql`
  ${MERGE_REQUEST_LIST_FIELDS}
  query CurrentUserReviewMergeRequests(
    $first: Int!
    $after: String
    $state: MergeRequestState
    $search: String
    $in: [IssuableSearchableField!]
    $sort: MergeRequestSort
    $labelName: [String]
    $milestoneTitle: String
    $targetBranches: [String!]
    $sourceBranches: [String!]
    $draft: Boolean
    $not: MergeRequestsResolverNegatedParams
    $includeArchived: Boolean
  ) {
    currentUser {
      reviewRequestedMergeRequests(
        first: $first
        after: $after
        state: $state
        search: $search
        in: $in
        sort: $sort
        labelName: $labelName
        milestoneTitle: $milestoneTitle
        targetBranches: $targetBranches
        sourceBranches: $sourceBranches
        draft: $draft
        not: $not
        includeArchived: $includeArchived
      ) {
        nodes {
          ...MergeRequestListFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const PROJECT_MERGE_REQUEST_BY_IID = gql`
  ${MERGE_REQUEST_LIST_FIELDS}
  query ProjectMergeRequestByIid($fullPath: ID!, $iid: String!) {
    project(fullPath: $fullPath) {
      mergeRequest(iid: $iid) {
        ...MergeRequestListFields
      }
    }
  }
`;

type MRListSource =
  | { kind: "project"; fullPath: string }
  | { kind: "group"; fullPath: string }
  | { kind: "assigned" }
  | { kind: "authored" }
  | { kind: "review" };

interface GqlUserNode {
  id: string;
  name: string;
  avatarUrl?: string | null;
  webUrl?: string | null;
}

interface GqlPipelineNode {
  id: string;
  status: string;
  detailedStatus?: { label?: string | null; name?: string | null } | null;
}

interface GqlMRListNode {
  id: string;
  iid: string;
  title: string;
  state: string;
  webUrl: string;
  reference?: string | null;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string | null;
  closedAt?: string | null;
  conflicts: boolean;
  autoMergeEnabled: boolean;
  forceRemoveSourceBranch?: boolean | null;
  squashOnMerge?: boolean | null;
  sourceBranch: string;
  targetBranch: string;
  targetProjectId: number;
  resolvedDiscussionsCount?: number | null;
  resolvableDiscussionsCount?: number | null;
  description?: string | null;
  project?: { webUrl: string; fullPath?: string | null } | null;
  author?: GqlUserNode | null;
  assignees?: { nodes: GqlUserNode[] };
  reviewers?: { nodes: GqlUserNode[] };
  labels?: {
    nodes: { id: string; title: string; color: string }[];
  };
  milestone?: { id: string; title: string } | null;
  headPipeline?: GqlPipelineNode | null;
  userPermissions?: { canMerge: boolean; updateMergeRequest: boolean };
  approvedBy?: { nodes: { username: string }[] };
  currentUserTodos?: { nodes: { id: string }[] } | null;
}

interface GqlMRConnection {
  nodes: GqlMRListNode[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
}

export interface MRListGqlFilters {
  state?: MergeRequestState;
  search?: string;
  in?: ("TITLE" | "DESCRIPTION")[];
  sort?: string;
  labelName?: string[];
  authorUsername?: string;
  assigneeUsername?: string;
  assigneeUsernames?: string[];
  reviewerUsername?: string;
  milestoneTitle?: string;
  targetBranches?: string[];
  sourceBranches?: string[];
  draft?: boolean;
  not?: Record<string, unknown>;
  includeArchived?: boolean;
}

type MergeRequestState = "opened" | "closed" | "merged" | "locked" | "all";

const endCursorsByCacheKey = new Map<string, string[]>();

export function resetMRListGqlCursors(cacheKey: string): void {
  endCursorsByCacheKey.delete(cacheKey);
}

function resolveAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) {
    return "";
  }
  if (/^https?:\/\//i.test(avatarUrl)) {
    return avatarUrl;
  }
  return gitlab.joinUrl(avatarUrl);
}

function resolveWebUrl(webUrl: string | null | undefined): string {
  if (!webUrl) {
    return "";
  }
  if (/^https?:\/\//i.test(webUrl)) {
    return webUrl;
  }
  return gitlab.joinUrl(webUrl);
}

function gqlUserToUser(user: GqlUserNode | null | undefined): User | undefined {
  if (!user) {
    return undefined;
  }
  const mapped = new User();
  mapped.id = getIdFromGqlId(user.id);
  mapped.name = user.name;
  mapped.avatar_url = resolveAvatarUrl(user.avatarUrl);
  mapped.web_url = resolveWebUrl(user.webUrl);
  return mapped;
}

function pipelineStatusToRest(status: string | undefined): string | undefined {
  if (!status) {
    return undefined;
  }
  return status.toLowerCase();
}

function pipelineStatusFromGql(pipeline: GqlPipelineNode | null | undefined): string | undefined {
  if (!pipeline) {
    return undefined;
  }
  const fromStatus = pipelineStatusToRest(pipeline.status);
  if (fromStatus) {
    return fromStatus;
  }
  if (pipeline.detailedStatus?.name) {
    return pipelineStatusToRest(pipeline.detailedStatus.name);
  }
  if (pipeline.detailedStatus?.label) {
    return pipelineStatusToRest(pipeline.detailedStatus.label);
  }
  return undefined;
}

export function gqlNodeToMergeRequest(node: GqlMRListNode, currentUsername?: string): MergeRequest {
  const approvedByCurrentUser = currentUsername
    ? (node.approvedBy?.nodes?.some((user) => user.username === currentUsername) ?? false)
    : undefined;
  const headStatus = pipelineStatusFromGql(node.headPipeline);
  return {
    title: node.title,
    web_url: node.webUrl,
    gql_id: node.id,
    id: getIdFromGqlId(node.id),
    iid: parseInt(node.iid, 10),
    state: node.state,
    updated_at: node.updatedAt,
    created_at: node.createdAt,
    merged_at: node.mergedAt ?? "",
    closed_at: node.closedAt ?? "",
    author: gqlUserToUser(node.author),
    assignees: node.assignees?.nodes.map((user) => gqlUserToUser(user)).filter((user): user is User => !!user) ?? [],
    reviewers: node.reviewers?.nodes.map((user) => gqlUserToUser(user)).filter((user): user is User => !!user) ?? [],
    project_id: node.targetProjectId,
    description: node.description ?? "",
    project_web_url: node.project?.webUrl ?? "",
    project_full_path: node.project?.fullPath ?? projectFullPathFromWebUrl(node.project?.webUrl ?? ""),
    reference_full: node.reference ?? "",
    labels:
      node.labels?.nodes.map(
        (label): Label => ({
          id: getIdFromGqlId(label.id),
          name: label.title,
          color: label.color,
          textColor: "",
          description: "",
        }),
      ) ?? [],
    source_branch: node.sourceBranch,
    target_branch: node.targetBranch,
    merge_commit_sha: "",
    sha: "",
    milestone: node.milestone ? { id: getIdFromGqlId(node.milestone.id), title: node.milestone.title } : undefined,
    draft: false,
    has_conflicts: node.conflicts === true,
    force_remove_source_branch: node.forceRemoveSourceBranch ?? undefined,
    squash_on_merge: node.squashOnMerge ?? undefined,
    merge_when_pipeline_succeeds: node.autoMergeEnabled,
    user_notes_count: undefined,
    resolved_discussions_count: node.resolvedDiscussionsCount ?? undefined,
    resolvable_discussions_count: node.resolvableDiscussionsCount ?? undefined,
    approvals_count: node.approvedBy?.nodes?.length,
    todo_id: node.currentUserTodos?.nodes[0]?.id ? getIdFromGqlId(node.currentUserTodos.nodes[0].id) : undefined,
    user:
      node.userPermissions || approvedByCurrentUser !== undefined
        ? {
            can_merge: node.userPermissions?.canMerge === true,
            can_update: node.userPermissions?.updateMergeRequest === true,
            approved: approvedByCurrentUser === true,
          }
        : undefined,
    head_pipeline: headStatus
      ? {
          id: node.headPipeline?.id ? getIdFromGqlId(node.headPipeline.id) : 0,
          status: headStatus,
        }
      : undefined,
  };
}

export function mrOrderByToGqlSort(orderBy: MRSearchOrderBy | MROrderBy | undefined): string | undefined {
  if (!orderBy || orderBy === "default") {
    return undefined;
  }
  const mapping: Record<MROrderBy, string> = {
    created_at: "CREATED_DESC",
    updated_at: "UPDATED_DESC",
    merged_at: "MERGED_AT_DESC",
    title: "TITLE_DESC",
    priority: "PRIORITY_DESC",
    label_priority: "LABEL_PRIORITY_DESC",
    milestone_due: "MILESTONE_DUE_DESC",
    popularity: "POPULARITY_DESC",
  };
  return mapping[orderBy as MROrderBy];
}

function splitParamList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value.map((entry) => `${entry}`.trim()).filter((entry) => entry.length > 0);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === "string" && value.length > 0) {
    const items = value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return items.length > 0 ? items : undefined;
  }
  return undefined;
}

function parseDraftParam(values: string[] | undefined): boolean | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }
  const normalized = values.map((value) => value.toLowerCase());
  if (normalized.some((value) => value === "yes" || value === "true" || value === "draft")) {
    return true;
  }
  if (normalized.some((value) => value === "no" || value === "false")) {
    return false;
  }
  return undefined;
}

function mergeNotFilter(
  current: Record<string, unknown> | undefined,
  key: string,
  value: unknown,
): Record<string, unknown> {
  return { ...(current ?? {}), [key]: value };
}

export function buildMRListGqlFilters(
  params: Record<string, any>,
  scope: MRScope,
  currentUsername?: string,
): MRListGqlFilters {
  const filters: MRListGqlFilters = {};

  const state = params.state as MRState | undefined;
  if (state && state !== MRState.all) {
    filters.state = state as MergeRequestState;
  }

  if (params.search) {
    filters.search = params.search;
    filters.in = ["TITLE"];
  }

  const sort = mrOrderByToGqlSort(params.order_by);
  if (sort) {
    filters.sort = sort;
  }

  const labels = splitParamList(params.labels);
  if (labels) {
    filters.labelName = labels;
  }

  const notLabels = splitParamList(params["not[labels]"]);
  if (notLabels) {
    filters.not = mergeNotFilter(filters.not, "labelName", notLabels);
  }

  const milestone = splitParamList(params.milestone);
  if (milestone?.[0]) {
    filters.milestoneTitle = milestone[0];
  }

  const notMilestone = splitParamList(params["not[milestone]"]);
  if (notMilestone?.[0]) {
    filters.not = mergeNotFilter(filters.not, "milestoneTitle", notMilestone[0]);
  }

  const targetBranch = splitParamList(params.target_branch);
  if (targetBranch) {
    filters.targetBranches = targetBranch;
  }

  const notTargetBranch = splitParamList(params["not[target_branch]"]);
  if (notTargetBranch) {
    filters.not = mergeNotFilter(filters.not, "targetBranches", notTargetBranch);
  }

  const draft = parseDraftParam(splitParamList(params.wip));
  if (draft !== undefined) {
    filters.draft = draft;
  }

  const author = splitParamList(params.author_username);
  if (author?.[0]) {
    filters.authorUsername = author[0];
  }

  const notAuthor = splitParamList(params["not[author_username]"]);
  if (notAuthor?.[0]) {
    filters.not = mergeNotFilter(filters.not, "authorUsername", notAuthor[0]);
  }

  const assignee = splitParamList(params.assignee_username);
  if (assignee?.[0]) {
    filters.assigneeUsername = assignee[0];
  }

  const notAssignee = splitParamList(params["not[assignee_username]"]);
  if (notAssignee?.[0]) {
    filters.not = mergeNotFilter(filters.not, "assigneeUsername", notAssignee[0]);
  }

  const reviewer = splitParamList(params.reviewer_username);
  if (reviewer?.[0]) {
    filters.reviewerUsername = reviewer[0];
  }

  const notReviewer = splitParamList(params["not[reviewer_username]"]);
  if (notReviewer?.[0]) {
    filters.not = mergeNotFilter(filters.not, "reviewerUsername", notReviewer[0]);
  }

  if (params.non_archived === true) {
    filters.includeArchived = false;
  }

  if (currentUsername && scope !== MRScope.all) {
    switch (scope) {
      case MRScope.created_by_me:
        filters.authorUsername = currentUsername;
        break;
      case MRScope.assigned_to_me:
        filters.assigneeUsername = currentUsername;
        break;
      case MRScope.reviews_for_me:
        filters.reviewerUsername = currentUsername;
        break;
    }
  }

  return filters;
}

function resolveMRListSource(params: Record<string, any>, project?: Project, group?: Group): MRListSource {
  if (group) {
    return { kind: "group", fullPath: group.full_path };
  }
  if (project) {
    return { kind: "project", fullPath: project.fullPath };
  }
  const scope = params.scope as MRScope | undefined;
  switch (scope) {
    case MRScope.assigned_to_me:
      return { kind: "assigned" };
    case MRScope.reviews_for_me:
      return { kind: "review" };
    case MRScope.created_by_me:
      return { kind: "authored" };
    case MRScope.all:
      throw new Error("Scope All requires a project or group");
    default:
      throw new Error("Merge request list scope requires a project or group");
  }
}

function connectionFromResponse(source: MRListSource, data: any): GqlMRConnection | undefined {
  switch (source.kind) {
    case "project":
      return data?.project?.mergeRequests;
    case "group":
      return data?.group?.mergeRequests;
    case "assigned":
      return data?.currentUser?.assignedMergeRequests;
    case "authored":
      return data?.currentUser?.authoredMergeRequests;
    case "review":
      return data?.currentUser?.reviewRequestedMergeRequests;
  }
}

async function queryMergeRequestConnection(
  source: MRListSource,
  variables: MRListGqlFilters & { first: number; after?: string },
): Promise<GqlMRConnection> {
  const client = getGitLabGQL().client;
  let query;
  switch (source.kind) {
    case "project":
      query = PROJECT_MERGE_REQUESTS;
      break;
    case "group":
      query = GROUP_MERGE_REQUESTS;
      break;
    case "assigned":
      query = CURRENT_USER_ASSIGNED_MERGE_REQUESTS;
      break;
    case "authored":
      query = CURRENT_USER_AUTHORED_MERGE_REQUESTS;
      break;
    case "review":
      query = CURRENT_USER_REVIEW_MERGE_REQUESTS;
      break;
  }

  const gqlVariables: Record<string, unknown> = {
    first: variables.first,
    after: variables.after,
    state: variables.state,
    search: variables.search,
    in: variables.in,
    sort: variables.sort,
    labelName: variables.labelName,
    authorUsername: variables.authorUsername,
    assigneeUsername: variables.assigneeUsername,
    assigneeUsernames: variables.assigneeUsernames,
    reviewerUsername: variables.reviewerUsername,
    milestoneTitle: variables.milestoneTitle,
    targetBranches: variables.targetBranches,
    sourceBranches: variables.sourceBranches,
    draft: variables.draft,
    not: variables.not,
  };

  if (
    variables.includeArchived !== undefined &&
    (source.kind === "assigned" || source.kind === "authored" || source.kind === "review")
  ) {
    gqlVariables.includeArchived = variables.includeArchived;
  }

  if (source.kind === "project" || source.kind === "group") {
    gqlVariables.fullPath = source.fullPath;
  }

  const response = await client.query({ query, variables: gqlVariables });
  const connection = connectionFromResponse(source, response.data);
  if (!connection) {
    throw new Error("Could not load merge requests");
  }
  return connection;
}

let cachedUsername: string | undefined;
let cachedUsernamePromise: Promise<string> | undefined;

async function getCurrentUsername(): Promise<string> {
  if (cachedUsername) {
    return cachedUsername;
  }
  if (!cachedUsernamePromise) {
    cachedUsernamePromise = gitlab.getMyself().then((user) => {
      cachedUsername = user.username;
      return user.username;
    });
  }
  return cachedUsernamePromise;
}

export async function fetchMergeRequestsGqlPage(options: {
  cacheKey: string;
  page: number;
  params: Record<string, any>;
  project?: Project;
  group?: Group;
}): Promise<{ mergeRequests: MergeRequest[]; hasMore: boolean }> {
  const { cacheKey, page, params, project, group } = options;
  const scope = (params.scope as MRScope | undefined) ?? MRScope.all;
  if (!project && !group && scope === MRScope.all) {
    return { mergeRequests: [], hasMore: false };
  }

  const source = resolveMRListSource(params, project, group);
  const applyScopeUserFilter = (source.kind === "project" || source.kind === "group") && scope !== MRScope.all;
  const currentUsername = await getCurrentUsername();
  const filters = buildMRListGqlFilters(params, scope, applyScopeUserFilter ? currentUsername : undefined);

  if (!endCursorsByCacheKey.has(cacheKey)) {
    endCursorsByCacheKey.set(cacheKey, []);
  }
  const cursors = endCursorsByCacheKey.get(cacheKey)!;

  if (page === 0) {
    cursors.length = 0;
  }

  if (page > 0 && cursors.length < page) {
    for (let index = cursors.length; index < page; index += 1) {
      const after = index === 0 ? undefined : cursors[index - 1];
      const connection = await queryMergeRequestConnection(source, {
        ...filters,
        first: MR_LIST_PAGE_SIZE,
        after,
      });
      cursors[index] = connection.pageInfo.endCursor ?? "";
      if (!connection.pageInfo.hasNextPage) {
        return { mergeRequests: [], hasMore: false };
      }
    }
  }

  const after = page > 0 ? cursors[page - 1] : undefined;
  const connection = await queryMergeRequestConnection(source, {
    ...filters,
    first: MR_LIST_PAGE_SIZE,
    after,
  });
  cursors[page] = connection.pageInfo.endCursor ?? "";

  return {
    mergeRequests: connection.nodes.map((node) => gqlNodeToMergeRequest(node, currentUsername)),
    hasMore: connection.pageInfo.hasNextPage,
  };
}

export async function fetchMergeRequestsGqlList(options: {
  params: Record<string, any>;
  project?: Project;
  group?: Group;
  limit?: number;
}): Promise<MergeRequest[]> {
  const limit = options.limit ?? 50;
  const cacheKey = `list_${Date.now()}`;
  const all: MergeRequest[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore && all.length < limit) {
    const { mergeRequests, hasMore: nextPage } = await fetchMergeRequestsGqlPage({
      cacheKey,
      page,
      params: options.params,
      project: options.project,
      group: options.group,
    });
    all.push(...mergeRequests);
    hasMore = nextPage;
    page += 1;
  }

  resetMRListGqlCursors(cacheKey);
  return all.slice(0, limit);
}

export async function fetchMergeRequestGqlByProjectIid(project: Project, iid: number): Promise<MergeRequest> {
  const response = await getGitLabGQL().client.query({
    query: PROJECT_MERGE_REQUEST_BY_IID,
    variables: { fullPath: project.fullPath, iid: `${iid}` },
  });
  const node = response.data?.project?.mergeRequest as GqlMRListNode | undefined;
  if (!node) {
    throw new Error("Merge request not found");
  }
  const currentUsername = await getCurrentUsername();
  return gqlNodeToMergeRequest(node, currentUsername);
}

export async function fetchMergeRequestGqlByProjectIdIid(projectId: number, iid: number): Promise<MergeRequest> {
  const project = await gitlab.getProject(projectId);
  return fetchMergeRequestGqlByProjectIid(project, iid);
}
