import { getPreferenceValues } from "@raycast/api";
import { getAccessToken, OAuthService } from "@raycast/utils";
import { demoDashboard } from "./demo";
import { AgentSession, DashboardResponse, Issue, IssueRelation, PageInfo, Team } from "./types";

const API_URL = "https://api.linear.app/graphql";

export const linearOAuth = OAuthService.linear({
  scope: "read write",
});

// Linear caps a query at 10,000 complexity points: 1 per object, 0.1 per
// property, and a connection multiplies its children by `first` (50 when
// omitted). Page sizes below keep each query near 5,000 by that arithmetic;
// anything past a page is fetched by cursor.
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
          labels(first: 20) { nodes { id name color } }
          inverseRelations(first: 10) {
            nodes {
              id
              type
              issue { id identifier title url state { name type } }
              relatedIssue { id identifier title url state { name type } }
            }
            pageInfo { hasNextPage endCursor }
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

// The rest of an issue's relations, for the rare issue with more than a page.
const RELATIONS_QUERY = `
  query LinearCommandCenterRelations($id: String!, $after: String) {
    issue(id: $id) {
      inverseRelations(first: 50, after: $after) {
        nodes {
          id
          type
          issue { id identifier title url state { name type } }
          relatedIssue { id identifier title url state { name type } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

// Teams and projects are paginated separately so a large workspace loses
// neither. A team's workflow states are a short fixed list, so they ride
// along with the team.
const TEAMS_QUERY = `
  query LinearCommandCenterTeams($after: String) {
    teams(first: 50, after: $after) {
      nodes {
        id
        key
        name
        states(first: 50) { nodes { id name type color } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const PROJECTS_QUERY = `
  query LinearCommandCenterProjects($after: String) {
    projects(first: 100, after: $after, includeArchived: false, orderBy: updatedAt) {
      nodes {
        id
        name
        teams(first: 10) { nodes { id } }
      }
      pageInfo { hasNextPage endCursor }
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

type TeamPage = { teams: { nodes: Array<Omit<Team, "projects">>; pageInfo: PageInfo } };
type ProjectPage = {
  projects: {
    nodes: Array<{ id: string; name: string; teams: { nodes: Array<{ id: string }> } }>;
    pageInfo: PageInfo;
  };
};
type RelationPage = { issue: { inverseRelations: { nodes: IssueRelation[]; pageInfo: PageInfo } } };

// Hard stop on any paginated loop, so a broken cursor can never spin forever.
const MAX_PAGES = 20;

const isDemo = () => {
  const preferences: Preferences = getPreferenceValues();
  return Boolean(preferences.demoMode);
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

async function loadTeams(): Promise<Team[]> {
  const teams: Array<Omit<Team, "projects">> = [];
  let after: string | null | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data: TeamPage = await linearRequest<TeamPage>(TEAMS_QUERY, { after });
    teams.push(...data.teams.nodes);
    if (!data.teams.pageInfo.hasNextPage || !data.teams.pageInfo.endCursor) break;
    after = data.teams.pageInfo.endCursor;
  }

  const projectsByTeam = new Map<string, Array<{ id: string; name: string }>>();
  let projectsAfter: string | null | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data: ProjectPage = await linearRequest<ProjectPage>(PROJECTS_QUERY, { after: projectsAfter });
    for (const project of data.projects.nodes) {
      for (const team of project.teams.nodes) {
        const list = projectsByTeam.get(team.id) ?? [];
        list.push({ id: project.id, name: project.name });
        projectsByTeam.set(team.id, list);
      }
    }
    if (!data.projects.pageInfo.hasNextPage || !data.projects.pageInfo.endCursor) break;
    projectsAfter = data.projects.pageInfo.endCursor;
  }

  return teams.map((team) => ({ ...team, projects: { nodes: projectsByTeam.get(team.id) ?? [] } }));
}

// Fetch the remaining relations for an issue whose first page was full, so a
// blocker past the page cannot go unnoticed.
async function completeRelations(issue: Issue): Promise<void> {
  let after = issue.inverseRelations.pageInfo?.endCursor;
  for (let page = 0; page < MAX_PAGES && after; page += 1) {
    const data: RelationPage = await linearRequest<RelationPage>(RELATIONS_QUERY, { id: issue.id, after });
    const connection = data.issue.inverseRelations;
    issue.inverseRelations.nodes.push(...connection.nodes);
    after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : undefined;
  }
  issue.inverseRelations.pageInfo = { hasNextPage: false, endCursor: null };
}

export async function loadDashboard(): Promise<DashboardResponse> {
  if (isDemo()) return demoDashboard();

  const issues = new Map<string, Issue>();
  const delegatedIssues = new Map<string, { id: string }>();
  const sessions = new Map<string, AgentSession>();
  const teams = await loadTeams();
  let viewerId = "";
  let issuesAfter: string | null | undefined;
  let delegatedAfter: string | null | undefined;
  let sessionsAfter: string | null | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await linearRequest<DashboardPageResponse>(DASHBOARD_QUERY, {
      first: 50,
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

  for (const issue of issues.values()) {
    if (issue.inverseRelations.pageInfo?.hasNextPage) await completeRelations(issue);
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

// Writes are simulated in demo mode: the sample data has made-up IDs, and a
// real mutation against them would only fail.
export async function updateIssueState(issueId: string, stateId: string): Promise<void> {
  if (isDemo()) return;
  const data = await linearRequest<{ issueUpdate: { success: boolean } }>(
    `mutation UpdateIssueState($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) { success }
    }`,
    { id: issueId, stateId },
  );
  if (!data.issueUpdate.success) throw new Error("Linear did not update the issue state");
}

export async function addIssueComment(issueId: string, body: string): Promise<void> {
  if (isDemo()) return;
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
  if (isDemo()) return { identifier: "ENG-999", url: "https://linear.app" };
  const data = await linearRequest<{
    issueCreate: { success: boolean; issue?: { identifier: string; url: string } | null };
  }>(
    `mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) { success issue { identifier url } }
    }`,
    { input },
  );
  if (!data.issueCreate.success || !data.issueCreate.issue) throw new Error("Linear did not create the issue");
  return data.issueCreate.issue;
}
