import { getPreferenceValues } from "@raycast/api";
import { getAccessToken, OAuthService } from "@raycast/utils";
import { demoDashboard } from "./demo";
import { AgentSession, DashboardResponse, Issue, PageInfo, Preferences, Team } from "./types";

const API_URL = "https://api.linear.app/graphql";

export const linearOAuth = OAuthService.linear({
  scope: "read write",
});

const DASHBOARD_QUERY = `
  query LinearCommandCenterDashboard(
    $first: Int!
    $issuesAfter: String
    $delegatedAfter: String
    $sessionsAfter: String
  ) {
    viewer {
      id
      assignedIssues(first: $first, after: $issuesAfter, includeArchived: false, orderBy: updatedAt) {
        nodes {
          id
          identifier
          title
          url
          priority
          priorityLabel
          dueDate
          updatedAt
          createdAt
          state { id name type color }
          team { id key name }
          project { id name }
          delegate { id name displayName }
          labels { nodes { id name color } }
          inverseRelations(first: 10) {
            nodes {
              id
              type
              issue { id identifier title url state { name type } }
              relatedIssue { id identifier title url state { name type } }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
      delegatedIssues(first: $first, after: $delegatedAfter, includeArchived: false, orderBy: updatedAt) {
        nodes { id }
        pageInfo { hasNextPage endCursor }
      }
    }
    agentSessions(first: $first, after: $sessionsAfter, includeArchived: false, orderBy: updatedAt) {
      nodes {
        id
        status
        summary
        updatedAt
        startedAt
        endedAt
        url
        externalLinks { label url }
        appUser { id name displayName }
        issue { id }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const TEAMS_QUERY = `
  query LinearCommandCenterTeams {
    teams(first: 25) {
      nodes {
        id
        key
        name
        states(first: 50) { nodes { id name type color } }
        projects(first: 50, includeArchived: false, orderBy: updatedAt) { nodes { id name } }
      }
    }
  }
`;

type DashboardPageResponse = {
  viewer: {
    id: string;
    assignedIssues: { nodes: Issue[]; pageInfo: PageInfo };
    delegatedIssues: { nodes: Array<{ id: string }>; pageInfo: PageInfo };
  };
  agentSessions: { nodes: AgentSession[]; pageInfo: PageInfo };
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function linearRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const { token } = getAccessToken();
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  });

  const payload = (await response.json().catch(() => undefined)) as GraphQLResponse<T> | undefined;
  if (!response.ok) {
    const details = payload?.errors?.map((error) => error.message).join("; ");
    throw new Error(details || `Linear API returned ${response.status}`);
  }

  if (payload?.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }
  if (!payload?.data) {
    throw new Error("Linear returned no data");
  }

  return payload.data;
}

export async function loadDashboard(): Promise<DashboardResponse> {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.demoMode) return demoDashboard();

  const issues = new Map<string, Issue>();
  const delegatedIssues = new Map<string, { id: string }>();
  const sessions = new Map<string, AgentSession>();
  const teamsData = await linearRequest<{ teams: { nodes: Team[] } }>(TEAMS_QUERY);
  const teams = teamsData.teams.nodes;
  let viewerId = "";
  let issuesAfter: string | null | undefined;
  let delegatedAfter: string | null | undefined;
  let sessionsAfter: string | null | undefined;

  for (let page = 0; page < 5; page += 1) {
    const data = await linearRequest<DashboardPageResponse>(DASHBOARD_QUERY, {
      first: 100,
      issuesAfter,
      delegatedAfter,
      sessionsAfter,
    });

    viewerId = data.viewer.id;
    for (const issue of data.viewer.assignedIssues.nodes) issues.set(issue.id, issue);
    for (const issue of data.viewer.delegatedIssues.nodes) delegatedIssues.set(issue.id, issue);
    for (const session of data.agentSessions.nodes) sessions.set(session.id, session);

    const issuesMore = data.viewer.assignedIssues.pageInfo.hasNextPage;
    const delegatedMore = data.viewer.delegatedIssues.pageInfo.hasNextPage;
    const sessionsMore = data.agentSessions.pageInfo.hasNextPage;
    if (!issuesMore && !delegatedMore && !sessionsMore) break;

    // Advance every cursor, including exhausted ones: a connection that has
    // no next page returns nothing after its last cursor, instead of the same
    // page again on every loop.
    issuesAfter = data.viewer.assignedIssues.pageInfo.endCursor ?? issuesAfter;
    delegatedAfter = data.viewer.delegatedIssues.pageInfo.endCursor ?? delegatedAfter;
    sessionsAfter = data.agentSessions.pageInfo.endCursor ?? sessionsAfter;
  }

  return {
    viewer: {
      id: viewerId,
      assignedIssues: { nodes: [...issues.values()] },
      delegatedIssues: { nodes: [...delegatedIssues.values()] },
    },
    agentSessions: { nodes: [...sessions.values()] },
    teams: { nodes: teams },
  };
}

export async function updateIssueState(issueId: string, stateId: string): Promise<void> {
  const data = await linearRequest<{ issueUpdate: { success: boolean } }>(
    `mutation UpdateIssueState($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) { success }
    }`,
    { id: issueId, stateId },
  );
  if (!data.issueUpdate.success) throw new Error("Linear did not update the issue state");
}

export async function addIssueComment(issueId: string, body: string): Promise<void> {
  const data = await linearRequest<{ commentCreate: { success: boolean } }>(
    `mutation AddIssueComment($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) { success }
    }`,
    { issueId, body },
  );
  if (!data.commentCreate.success) throw new Error("Linear did not create the comment");
}

type CreateIssueInput = {
  teamId: string;
  title: string;
  description?: string;
  stateId?: string;
  projectId?: string;
  priority: number;
};

export async function createIssue(input: CreateIssueInput): Promise<{ identifier: string; url: string }> {
  const data = await linearRequest<{
    issueCreate: { success: boolean; issue?: { identifier: string; url: string } | null };
  }>(
    `mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) { success issue { identifier url } }
    }`,
    { input },
  );
  if (!data.issueCreate.success || !data.issueCreate.issue)
    throw new Error("Linear did not create the issue");
  return data.issueCreate.issue;
}
