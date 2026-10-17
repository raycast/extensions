import { getPreferenceValues } from "@raycast/api";
import { getJiraAuthToken } from "./jira-auth.service";

interface Preferences {
  jiraBaseUrl: string;
}

export interface JiraIssue {
  key: string;
  id: string;
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
    updated?: string;
  };
}

/**
 * Get the top 10 issues with the most recent activity from Jira
 * This includes any activity: updates, comments, status changes, PR links, etc.
 * Returns full issue objects instead of just keys
 */
export async function getRecentActivityIssues(): Promise<JiraIssue[]> {
  try {
    const { jiraBaseUrl } = getPreferenceValues<Preferences>();
    const authToken = getJiraAuthToken();

    // Use a simpler JQL that searches for issues you've interacted with recently
    // This includes assigned, watching, or created by you, ordered by last update
    const jql = "assignee = currentUser() OR reporter = currentUser() OR watcher = currentUser() ORDER BY updated DESC";

    const response = await fetch(`${jiraBaseUrl}/rest/api/3/search/jql`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jql: jql,
        maxResults: 10,
        fields: ["summary", "status", "issuetype", "project", "updated"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch recent activity from Jira:", response.status, errorText);
      return [];
    }

    const data = (await response.json()) as { issues: JiraIssue[] };
    return data.issues;
  } catch (error) {
    console.error("Error fetching recent activity issues:", error);
    return [];
  }
}
