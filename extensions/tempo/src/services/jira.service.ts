import { getPreferenceValues } from "@raycast/api";
import { getJiraAuthToken } from "./jira-auth.service";

interface Preferences {
  jiraBaseUrl: string;
}

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    issuetype: {
      name: string;
      iconUrl?: string;
    };
  };
}

/**
 * Helper function to make authenticated API calls to Jira
 */
export async function fetchFromJiraAPI(endpoint: string, options: RequestInit = {}) {
  const { jiraBaseUrl } = getPreferenceValues<Preferences>();

  // Create basic auth token
  const authToken = getJiraAuthToken();

  const url = `${jiraBaseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jira API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get Jira issue key and summary from issue ID
 */
export async function getIssueById(
  issueId: string | number,
): Promise<{ key: string; summary: string; iconUrl?: string }> {
  try {
    const response = (await fetchFromJiraAPI(`/rest/api/3/issue/${issueId}`)) as JiraIssue;
    return {
      key: response.key,
      summary: response.fields.summary,
      iconUrl: response.fields.issuetype.iconUrl,
    };
  } catch (error) {
    console.error(`Failed to get issue for ID ${issueId}:`, error);
    throw error;
  }
}

/**
 * Get issue keys and summaries for multiple worklogs
 * Maps Jira issue IDs to their corresponding issue data
 */
export async function getIssueKeysMap(
  worklogs: Array<{ issue?: { id: number } }>,
): Promise<Record<string, { key: string; summary: string; iconUrl?: string }>> {
  // Extract unique issue IDs
  const uniqueIssueIds = [...new Set(worklogs.map((worklog) => worklog.issue?.id).filter((id) => id != null))];

  if (uniqueIssueIds.length === 0) return {};

  // Create issue ID to data map
  const issueIdToDataMap: Record<string, { key: string; summary: string; iconUrl?: string }> = {};

  // Fetch issue data in parallel
  await Promise.all(
    uniqueIssueIds.map(async (issueId) => {
      try {
        const issueData = await getIssueById(issueId as number);
        issueIdToDataMap[issueId as number] = issueData;
      } catch (error) {
        console.error(`Could not get data for issue ID ${issueId}: ${(error as Error).message}`);
      }
    }),
  );

  return issueIdToDataMap;
}
