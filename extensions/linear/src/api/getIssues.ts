import {
  Comment,
  Cycle,
  Issue,
  IssueRelation,
  Project,
  ProjectMilestone,
  Team,
  User,
  WorkflowState,
} from "@linear/sdk";
import { getPreferenceValues } from "@raycast/api";

import { getLinearClient } from "../api/linearClient";

import { LabelResult } from "./getLabels";
import { getPaginated, PageInfo } from "./pagination";

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_LIMIT = 50;

const preferences = getPreferenceValues<Preferences>();

function getPageLimits() {
  const limit = preferences.limit ? +preferences.limit : DEFAULT_LIMIT;
  const pageSize = Math.min(DEFAULT_PAGE_SIZE, limit);
  const pageLimit = Math.floor(limit / pageSize);
  return { pageSize, pageLimit };
}

function getCompletedIssuesFilter(
  {
    inFilterBlock,
    addComma,
    inParentheses,
  }: { inFilterBlock?: boolean; addComma?: boolean; inParentheses?: boolean } = {
    inFilterBlock: false,
    inParentheses: false,
    addComma: true,
  },
) {
  return !preferences.shouldHideRedundantIssues
    ? ""
    : [
        ...(inParentheses ? ["("] : []),
        ...(addComma ? [", "] : []),
        ...(!inFilterBlock ? ["filter: { "] : []),
        "completedAt: { null: true }, canceledAt: { null: true }",
        ...(!inFilterBlock ? [" }"] : []),
        ...(inParentheses ? [")"] : []),
      ].join("");
}

export const IssueFragment = `
  id
  identifier
  title
  branchName
  priority
  priorityLabel
  estimate
  dueDate
  updatedAt
  url
  number
  labels {
    nodes {
      id
      name
      color
    }
  }
  state {
    id
    type
    name
    color
  }
  assignee {
    id
    displayName
    email
    avatarUrl
  }
  team {
    id
    issueEstimationType
    issueEstimationAllowZero
    issueEstimationExtended
    activeCycle {
      id
    }
  }
  cycle {
    id
    number
    startsAt
    endsAt
    completedAt
  }
  parent {
    id
    title
    number
    state {
      type
      color
    }
  }
  project {
    id
    name
    icon
    color
  }
  projectMilestone {
    id
    name
  }
`;

export type IssueState = Pick<WorkflowState, "id" | "type" | "name" | "color">;

export type IssueResult = Pick<
  Issue,
  | "id"
  | "identifier"
  | "title"
  | "priority"
  | "url"
  | "branchName"
  | "priorityLabel"
  | "updatedAt"
  | "estimate"
  | "dueDate"
  | "number"
> & {
  assignee?: Pick<User, "id" | "displayName" | "avatarUrl" | "email">;
} & {
  state: IssueState;
} & {
  labels: {
    nodes: LabelResult[];
  };
} & {
  team: Pick<Team, "id" | "issueEstimationType" | "issueEstimationAllowZero" | "issueEstimationExtended"> & {
    activeCycle?: Pick<Cycle, "id">;
  };
} & {
  cycle?: Pick<Cycle, "id" | "number" | "startsAt" | "endsAt" | "completedAt">;
} & {
  parent?: Pick<Issue, "id" | "title" | "number"> & { state: Pick<WorkflowState, "type" | "color"> };
} & {
  project?: Pick<Project, "id" | "name" | "icon" | "color">;
} & {
  projectMilestone?: Pick<ProjectMilestone, "id" | "name" | "targetDate">;
};

export async function getLastUpdatedIssues(after?: string) {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { issues: { nodes: IssueResult[]; pageInfo: { endCursor: string; hasNextPage: boolean } } },
    Record<string, unknown>
  >(
    `
      query($after: String) {
        issues(first: 25, orderBy: updatedAt, after: $after${getCompletedIssuesFilter()}) {
          nodes {
            ${IssueFragment}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
    { after },
  );

  return { issues: data?.issues.nodes, pageInfo: data?.issues.pageInfo };
}

export async function searchIssues(query: string, after?: string) {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { searchIssues: { nodes: IssueResult[]; pageInfo: { endCursor: string; hasNextPage: boolean } } },
    { term: string; after?: string; first?: number; includeArchived?: boolean }
  >(
    `
      query($term: String!, $after: String, $first: Int, $includeArchived: Boolean) {
        searchIssues(first: $first, term: $term, after: $after, includeArchived: $includeArchived) {
          nodes {
            ${IssueFragment}
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    `,
    { term: query, after, first: 25, includeArchived: false },
  );

  return { issues: data?.searchIssues.nodes, pageInfo: data?.searchIssues.pageInfo };
}

export async function filterIssues(filter: string, after?: string) {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { issues: { nodes: IssueResult[]; pageInfo: { endCursor: string; hasNextPage: boolean } } },
    { filter: string; after?: string }
  >(
    `
      query($filter: IssueFilter!, $after: String) {
        issues(first: 25, filter: $filter, after: $after${getCompletedIssuesFilter()}) {
          nodes {
            ${IssueFragment}
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    `,
    { filter: JSON.parse(filter), after },
  );

  return { issues: data?.issues.nodes, pageInfo: data?.issues.pageInfo };
}

export async function getLastCreatedIssues() {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<{ issues: { nodes: IssueResult[] } }, Record<string, unknown>>(
    `
      query {
        issues(orderBy: createdAt${getCompletedIssuesFilter()}) {
          nodes {
            ${IssueFragment}
          }
        }
      }
    `,
  );

  return data?.issues.nodes;
}

export async function getMyIssues() {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { viewer: { assignedIssues: { nodes: IssueResult[] } } },
    Record<string, unknown>
  >(
    `
      query {
        viewer {
          assignedIssues(orderBy: updatedAt${getCompletedIssuesFilter()}) {
            nodes {
              ${IssueFragment}
            }
          }
        }
      }
    `,
  );

  return data?.viewer.assignedIssues.nodes;
}

export async function getCreatedIssues() {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { viewer: { createdIssues: { nodes: IssueResult[] } } },
    Record<string, unknown>
  >(
    `
      query {
        viewer {
          createdIssues(orderBy: updatedAt${getCompletedIssuesFilter()}) {
            nodes {
              ${IssueFragment}
            }
          }
        }
      }
    `,
  );

  return data?.viewer.createdIssues.nodes;
}

export async function getActiveCycleIssues(cycleId?: string) {
  if (!cycleId) {
    return [];
  }

  const { graphQLClient } = getLinearClient();

  const { pageSize, pageLimit } = getPageLimits();

  const nodes = getPaginated(
    async (cursor) =>
      graphQLClient.rawRequest<
        { cycle: { issues: { nodes: IssueResult[]; pageInfo: PageInfo } } },
        Record<string, unknown>
      >(
        `
          query($cycleId: String!, $cursor: String) {
            cycle(id: $cycleId) {
              issues(first: ${pageSize}, after: $cursor${getCompletedIssuesFilter()}) {
                nodes {
                  ${IssueFragment}
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        `,
        { cycleId, cursor },
      ),
    (r) => r.data?.cycle.issues.pageInfo,
    (accumulator: IssueResult[], currentValue) => accumulator.concat(currentValue.data?.cycle.issues.nodes || []),
    [],
    pageLimit,
  );

  return nodes;
}

export async function getProjectIssues(projectId: string) {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<{ issues: { nodes: IssueResult[] } }, Record<string, unknown>>(
    `
      query($projectId: ID) {
        issues(filter: { project: { id: { eq: $projectId } }${getCompletedIssuesFilter({
          inFilterBlock: true,
          addComma: true,
        })} } ) {
          nodes {
            ${IssueFragment}
          }
        }
      }
    `,
    { projectId },
  );

  return data?.issues.nodes;
}

export async function getProjectMilestoneIssues(milestoneId: string) {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<{ issues: { nodes: IssueResult[] } }, Record<string, unknown>>(
    `
      query($milestoneId: ID) {
        issues(filter: { projectMilestone: { id: { eq: $milestoneId } }${getCompletedIssuesFilter({
          inFilterBlock: true,
          addComma: true,
        })} } ) {
          nodes {
            ${IssueFragment}
          }
        }
      }
    `,
    { milestoneId },
  );

  return data?.issues.nodes;
}

export async function getSubIssues(issueId: string) {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { issue: { children: { nodes: IssueResult[] } } },
    Record<string, unknown>
  >(
    `
      query($issueId: String!) {
        issue(id: $issueId) {
          children${getCompletedIssuesFilter({ inParentheses: true })} {
            nodes {
              ${IssueFragment}
              sortOrder
            }
          }
        }
      }
    `,
    { issueId },
  );

  if (!data) {
    throw new Error("Cannot find the Linear issue");
  }

  return data.issue.children.nodes;
}

export type CommentResult = Pick<Comment, "id" | "body" | "createdAt" | "url"> & {
  user: Pick<User, "id" | "displayName" | "avatarUrl" | "email">;
};

export async function getComments(issueId: string) {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<
    { issue: { comments: { nodes: CommentResult[] } } },
    Record<string, unknown>
  >(
    `
      query($issueId: String!) {
        issue(id: $issueId) {
          comments {
            nodes {
              id
              body
              createdAt
              url
              user {
                id
                displayName
                email
                avatarUrl
              }
            }
          }
        }
      }
    `,
    { issueId },
  );

  if (!data) {
    throw new Error("Cannot find the Linear issue");
  }

  return data.issue.comments.nodes;
}

export type Attachment = {
  id: string;
  title: string;
  subtitle: string;
  source?: {
    imageUrl?: string;
  };
  url: string;
  updatedAt: string;
};

export type IssueDetailResult = IssueResult &
  Pick<Issue, "description" | "dueDate"> & {
    attachments?: {
      nodes: Attachment[];
    };
    relations?: {
      nodes: [
        Pick<IssueRelation, "id" | "type"> & {
          relatedIssue: Pick<Issue, "identifier" | "title"> & {
            state: Pick<WorkflowState, "type" | "color">;
          };
        },
      ];
    };
  };

export async function getIssueDetail(issueId: string) {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<{ issue: IssueDetailResult }, Record<string, unknown>>(
    `
      query($issueId: String!) {
        issue(id: $issueId) {
          ${IssueFragment}
          attachments {
            nodes {
              id
              title
              subtitle
              source
              url
              updatedAt
            }
          }
          description
          relations {
            nodes {
              id
              type
              relatedIssue {
                id
                identifier
                title
                state {
                  color
                  type
                }
              }
            }
          }
        }
      }
    `,
    { issueId },
  );

  if (!data) {
    throw new Error("Cannot find the Linear issue");
  }

  return data.issue;
}
