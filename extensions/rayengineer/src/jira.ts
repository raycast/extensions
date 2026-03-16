import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  jiraUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: {
      id: string;
      name: string;
      statusCategory: {
        key: string;
        name: string;
      };
    };
    assignee: JiraUser | null;
    issuetype: {
      name: string;
      iconUrl?: string;
    };
    project: {
      key: string;
      name: string;
    };
    timetracking?: {
      originalEstimate?: string;
      remainingEstimate?: string;
      timeSpent?: string;
      timeSpentSeconds?: number;
    };
  };
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
    statusCategory: {
      key: string;
    };
  };
}

interface SearchResponse {
  issues: JiraIssue[];
  total: number;
}

function getConfig(): Preferences {
  return getPreferenceValues<Preferences>();
}

function getBaseUrl(): string {
  const { jiraUrl } = getConfig();
  return jiraUrl.replace(/\/+$/, "");
}

function getAuthHeader(): string {
  const { jiraEmail, jiraApiToken } = getConfig();
  return (
    "Basic " + Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString("base64")
  );
}

async function jiraRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    Authorization: getAuthHeader(),
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API error ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export async function getMyself(): Promise<JiraUser> {
  return jiraRequest<JiraUser>("GET", "/rest/api/3/myself");
}

export async function searchIssues(
  jql: string,
  maxResults: number = 5,
): Promise<JiraIssue[]> {
  const data = await jiraRequest<SearchResponse>(
    "POST",
    "/rest/api/3/search/jql",
    {
      jql,
      maxResults,
      fields: [
        "summary",
        "status",
        "assignee",
        "issuetype",
        "project",
        "timetracking",
      ],
    },
  );
  return data.issues;
}

export async function getAssignedIssues(): Promise<JiraIssue[]> {
  return searchIssues(
    "assignee = currentUser() AND resolution = Unresolved AND status != Done AND issuetype != Epic ORDER BY updated DESC",
    5,
  );
}

export async function getRecentIssues(): Promise<JiraIssue[]> {
  return searchIssues(
    "issuekey in issueHistory() AND resolution = Unresolved AND status != Done AND issuetype != Epic ORDER BY lastViewed DESC",
    5,
  );
}

export async function getIssue(issueKey: string): Promise<JiraIssue> {
  return jiraRequest<JiraIssue>(
    "GET",
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}`,
  );
}

export async function getTransitions(
  issueKey: string,
): Promise<JiraTransition[]> {
  const data = await jiraRequest<{ transitions: JiraTransition[] }>(
    "GET",
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
  );
  return data.transitions;
}

export async function transitionIssue(
  issueKey: string,
  transitionId: string,
): Promise<void> {
  await jiraRequest(
    "POST",
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
    {
      transition: { id: transitionId },
    },
  );
}

export async function assignIssue(
  issueKey: string,
  accountId: string,
): Promise<void> {
  await jiraRequest(
    "PUT",
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`,
    {
      accountId,
    },
  );
}

export async function addWorklog(
  issueKey: string,
  timeSpentSeconds: number,
  comment?: string,
): Promise<void> {
  const body: Record<string, unknown> = { timeSpentSeconds };
  if (comment) {
    body.comment = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: comment }],
        },
      ],
    };
  }
  await jiraRequest(
    "POST",
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog`,
    body,
  );
}

export async function getInProgressTransition(
  issueKey: string,
): Promise<JiraTransition | null> {
  const transitions = await getTransitions(issueKey);
  return (
    transitions.find((t) => t.to.statusCategory.key === "indeterminate") ?? null
  );
}

export async function getDoneTransitions(
  issueKey: string,
): Promise<JiraTransition[]> {
  const transitions = await getTransitions(issueKey);
  return transitions.filter((t) => t.to.statusCategory.key === "done");
}

export function getIssueBrowseUrl(issueKey: string): string {
  return `${getBaseUrl()}/browse/${issueKey}`;
}
