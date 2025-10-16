import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  jiraBaseUrl: string;
  jiraUsername: string;
  jiraApiToken: string;
  jiraProjectKey: string;
}

interface JiraTicket {
  key: string;
  fields: {
    summary: string;
  };
}

export async function fetchJiraTicket(ticketNumber: string): Promise<{ title: string; url: string; fullKey: string }> {
  const preferences = getPreferenceValues<Preferences>();
  const { jiraBaseUrl, jiraUsername, jiraApiToken, jiraProjectKey } = preferences;

  // Build full ticket key (e.g., SO-123)
  const fullTicketKey = `${jiraProjectKey}-${ticketNumber}`;

  // Build JIRA API URL
  const apiUrl = `${jiraBaseUrl}/rest/api/3/issue/${fullTicketKey}`;

  // Create Basic Auth header
  const authHeader = `Basic ${Buffer.from(`${jiraUsername}:${jiraApiToken}`).toString("base64")}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Ticket ${fullTicketKey} not found`);
      } else if (response.status === 401) {
        throw new Error("Authentication failed. Please check your JIRA credentials in preferences.");
      } else {
        throw new Error(`Failed to fetch ticket: ${response.statusText}`);
      }
    }

    const data = (await response.json()) as JiraTicket;

    // Build ticket URL
    const ticketUrl = `${jiraBaseUrl}/browse/${fullTicketKey}`;

    return {
      title: data.fields.summary,
      url: ticketUrl,
      fullKey: fullTicketKey,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while fetching the JIRA ticket");
  }
}

export function buildMarkdownLink(ticketNumber: string, title: string, url: string, projectKey: string): string {
  return `[${projectKey}-${ticketNumber}](${url}): ${title}`;
}
