import { getPreferenceValues } from "@raycast/api";
import { getJiraAuthToken } from "./jira-auth.service";

interface Preferences {
  jiraBaseUrl: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    issuetype: {
      name: string;
      iconUrl?: string;
    };
    project: {
      key: string;
      name: string;
    };
  };
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
}

/**
 * Search for issues assigned to the current user
 */
export async function getAssignedIssues(): Promise<JiraIssue[]> {
  const { jiraBaseUrl } = getPreferenceValues<Preferences>();
  const authToken = getJiraAuthToken();

  const jql = "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC";

  const response = await fetch(`${jiraBaseUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      jql: jql,
      maxResults: 50,
      fields: ["summary", "status", "issuetype", "project"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch assigned issues: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as JiraSearchResponse;
  return data.issues;
}

/**
 * Search for issues in a specific project
 */
export async function getProjectIssues(projectKey: string): Promise<JiraIssue[]> {
  const { jiraBaseUrl } = getPreferenceValues<Preferences>();
  const authToken = getJiraAuthToken();

  const jql = `project = ${projectKey} AND statusCategory != Done ORDER BY updated DESC`;

  const response = await fetch(`${jiraBaseUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      jql: jql,
      maxResults: 50,
      fields: ["summary", "status", "issuetype", "project"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch project issues: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as JiraSearchResponse;
  return data.issues;
}

/**
 * Search for issues by text query (for autocomplete)
 */
export async function searchIssues(query: string): Promise<JiraIssue[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const { jiraBaseUrl } = getPreferenceValues<Preferences>();
  const authToken = getJiraAuthToken();

  // Search by issue key or summary
  const jql = `(key ~ "${query}*" OR summary ~ "${query}*") ORDER BY updated DESC`;

  const response = await fetch(`${jiraBaseUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      jql: jql,
      maxResults: 20,
      fields: ["summary", "status", "issuetype", "project"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to search issues: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as JiraSearchResponse;
  return data.issues;
}

/**
 * Get issue by exact key
 */
export async function getIssueByKey(issueKey: string): Promise<JiraIssue | null> {
  try {
    const { jiraBaseUrl } = getPreferenceValues<Preferences>();
    const authToken = getJiraAuthToken();

    const response = await fetch(
      `${jiraBaseUrl}/rest/api/3/issue/${issueKey}?fields=summary,status,issuetype,project`,
      {
        headers: {
          Authorization: `Basic ${authToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as JiraIssue;
  } catch {
    return null;
  }
}

/**
 * Get project details by key
 */
export async function getProjectByKey(projectKey: string): Promise<{ key: string; name: string } | null> {
  try {
    const { jiraBaseUrl } = getPreferenceValues<Preferences>();
    const authToken = getJiraAuthToken();

    const response = await fetch(`${jiraBaseUrl}/rest/api/3/project/${projectKey}`, {
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const project = (await response.json()) as { key: string; name: string };
    return project;
  } catch {
    return null;
  }
}
