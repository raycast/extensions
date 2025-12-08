/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPreferenceValues } from "@raycast/api";
import { authorize } from "./oauth";
import { Issue, IssueType, Preferences, Project, User } from "./types";

const preferences = getPreferenceValues<Preferences>();

async function getAuthHeader(): Promise<string> {
  if (preferences.clientId) {
    const token = await authorize();
    if (!token) throw new Error("Failed to get OAuth token");
    return `Bearer ${token}`;
  }

  if (!preferences.email || !preferences.apiToken) {
    throw new Error("Email and API Token are required for Basic Auth");
  }

  return `Basic ${Buffer.from(`${preferences.email}:${preferences.apiToken}`).toString("base64")}`;
}

async function jiraFetch(path: string, options: any = {}): Promise<any> {
  const authHeader = await getAuthHeader();
  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/rest/api/3${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `Jira API Error ${response.status}`;

    try {
      const errorJson = JSON.parse(text);
      if (errorJson.errorMessages && errorJson.errorMessages.length > 0) {
        errorMessage = errorJson.errorMessages.join(", ");
      } else if (errorJson.errors) {
        const fieldErrors = Object.entries(errorJson.errors)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
        if (fieldErrors) {
          errorMessage = fieldErrors;
        }
      } else if (errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      // If parsing fails, use the raw text if it's not too long, or just the status
      if (text.length < 200) errorMessage += `: ${text}`;
    }

    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  // Even if not 204, sometimes content might be empty?
  // Let's safe parse
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function getMyself(): Promise<User> {
  return jiraFetch("/myself");
}

export async function searchIssues(jql: string): Promise<Issue[]> {
  const result = await jiraFetch("/search/jql", {
    method: "POST",
    body: JSON.stringify({
      jql,
      fields: ["summary", "status", "assignee", "issuetype", "project", "watches"],
    }),
  });
  return result.issues;
}

export async function getIssue(issueIdOrKey: string): Promise<any> {
  return jiraFetch(`/issue/${issueIdOrKey}?expand=renderedFields,names,schema,transitions`);
}

export async function getIssueComments(issueIdOrKey: string): Promise<any[]> {
  const result = await jiraFetch(`/issue/${issueIdOrKey}/comment`);
  return result.comments || [];
}

export async function createIssue(body: any): Promise<Issue> {
  return jiraFetch("/issue", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function searchUsers(query: string = ""): Promise<User[]> {
  return jiraFetch(`/user/search?query=${encodeURIComponent(query)}`);
}

export async function getProjects(): Promise<Project[]> {
  // Pagination might be needed, but for now using /project/search which is the v3 way
  const result = await jiraFetch("/project/search");
  return result.values || result;
}

export async function getIssueTypes(): Promise<IssueType[]> {
  return jiraFetch("/issuetype");
}

export async function getProjectIssueTypes(projectId: string): Promise<IssueType[]> {
  const result = await jiraFetch(`/issue/createmeta?projectIds=${projectId}&expand=projects.issuetypes`);
  return result.projects?.[0]?.issuetypes || [];
}

export async function addWorklog(issueIdOrKey: string, timeSpentSeconds: number, comment?: string, started?: Date) {
  const body: any = {
    timeSpentSeconds,
    comment: comment
      ? {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: comment,
                },
              ],
            },
          ],
        }
      : undefined,
  };

  if (started) {
    // Format: 2021-01-01T12:00:00.000+0000
    // But Jira API v3 often accepts ISO 8601 string.
    // Let's use simple toISOString() but we might need to adjust timezone if Jira is strict.
    // Jira usually expects: "2021-01-17T12:34:00.000+0000"
    // toISOString gives "2021-01-17T12:34:00.000Z" which is usually fine.
    // Let's try standard ISO first.
    body.started = started.toISOString().replace("Z", "+0000");
  }

  return jiraFetch(`/issue/${issueIdOrKey}/worklog`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function addComment(issueIdOrKey: string, comment: string) {
  return jiraFetch(`/issue/${issueIdOrKey}/comment`, {
    method: "POST",
    body: JSON.stringify({
      body: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: comment,
              },
            ],
          },
        ],
      },
    }),
  });
}

export async function assignIssue(issueIdOrKey: string, accountId: string) {
  return jiraFetch(`/issue/${issueIdOrKey}/assignee`, {
    method: "PUT",
    body: JSON.stringify({
      accountId: accountId,
    }),
  });
}

export async function getTransitions(issueIdOrKey: string): Promise<any[]> {
  const result = await jiraFetch(`/issue/${issueIdOrKey}/transitions`);
  return result.transitions;
}

export async function transitionIssue(issueIdOrKey: string, transitionId: string) {
  return jiraFetch(`/issue/${issueIdOrKey}/transitions`, {
    method: "POST",
    body: JSON.stringify({
      transition: {
        id: transitionId,
      },
    }),
  });
}

export async function getIssueWorklogs(issueIdOrKey: string): Promise<any[]> {
  const result = await jiraFetch(`/issue/${issueIdOrKey}/worklog`);
  return result.worklogs;
}

export async function getNotifications(): Promise<any[]> {
  // Queries unread notifications by default
  const result = await jiraFetch("/notification?read=false");
  return result.results || result.values || [];
  // Note: V3 API typically wrapper response in 'results' or paging.
}

export async function getBoards(): Promise<any[]> {
  // Note: Agile API uses /rest/agile/1.0 instead of /rest/api/3
  const authHeader = await getAuthHeader();
  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/rest/agile/1.0/board`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API Error ${response.status}: ${text}`);
  }

  const result = await response.json();
  return (result as any).values || [];
}

export async function getActiveSprints(boardId: number): Promise<any[]> {
  const authHeader = await getAuthHeader();
  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/rest/agile/1.0/board/${boardId}/sprint?state=active`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API Error ${response.status}: ${text}`);
  }

  const result = await response.json();
  return (result as any).values || [];
}

export async function getSprintIssues(sprintId: number): Promise<any[]> {
  const authHeader = await getAuthHeader();
  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${domain}/rest/agile/1.0/sprint/${sprintId}/issue`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API Error ${response.status}: ${text}`);
  }

  const result = await response.json();
  return (result as any).issues || [];
}

export async function getFavoriteFilters(): Promise<any[]> {
  const result = await jiraFetch("/filter/favourite");
  return result;
}

export async function getIssueLinkTypes(): Promise<any[]> {
  const result = await jiraFetch("/issueLinkType");
  return result.issueLinkTypes;
}

export async function linkIssues(sourceKey: string, targetKey: string, linkTypeId: string) {
  // Try using name as per previous attempt, but usually it's better to verify if name or id is required.
  // v3: POST /rest/api/3/issueLink
  // body: { type: { name: "Duplicate" }, ... } or { type: { id: "1000" }, ... }
  // We will assume "name" is passed from the UI for readability, matching the getIssueLinkTypes output.
  return jiraFetch("/issueLink", {
    method: "POST",
    body: JSON.stringify({
      type: { name: linkTypeId }, // we'll pass the name here
      inwardIssue: { key: sourceKey },
      outwardIssue: { key: targetKey },
    }),
  });
}

export async function addWatcher(issueKey: string, accountId?: string) {
  // If no accountId provided, add current user
  const user = await getMyself();
  const targetAccountId = accountId || user.accountId;

  return jiraFetch(`/issue/${issueKey}/watchers`, {
    method: "POST",
    body: JSON.stringify(targetAccountId),
  });
}

export async function removeWatcher(issueKey: string, accountId: string) {
  return jiraFetch(`/issue/${issueKey}/watchers?accountId=${accountId}`, {
    method: "DELETE",
  });
}
