import { getPreferenceValues } from "@raycast/api";

import { JiraIssue, Worklog } from "@/types/models";

class JiraClient {
  private domain: string;
  private auth: string;

  constructor() {
    const prefs = getPreferenceValues<Preferences>();
    this.domain = prefs.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    this.auth = Buffer.from(`${prefs.email}:${prefs.apiToken}`).toString("base64");
  }

  private async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `https://${this.domain}/rest/api/3/${endpoint}`;
    const headers = {
      Authorization: `Basic ${this.auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      await this.handleError(response);
    }

    return response;
  }

  private async handleError(response: Response): Promise<never> {
    let errorMsg = `Jira API Error ${response.status}`;
    try {
      const errorData = (await response.json()) as { errorMessages?: string[]; errors?: Record<string, string> };
      if (errorData.errorMessages?.length) {
        errorMsg += `: ${errorData.errorMessages.join(", ")}`;
      } else if (errorData.errors) {
        const details = Object.entries(errorData.errors)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        if (details) errorMsg += `: ${details}`;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  async validateCredentials(): Promise<void> {
    await this.fetch("myself");
  }

  async getAssignedIssues(): Promise<JiraIssue[]> {
    const response = await this.fetch("search/jql", {
      method: "POST",
      body: JSON.stringify({
        jql: "assignee = currentUser() ORDER BY updated DESC",
        fields: ["summary"],
        maxResults: 100,
      }),
    });

    const data = (await response.json()) as { issues: { key: string; fields: { summary: string } }[] };

    return (data.issues || []).map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
    }));
  }

  async searchIssues(query: string): Promise<JiraIssue[]> {
    const jql = `(summary ~ "${query}*" OR summary ~ "${query}~" OR key ~ "${query}") AND assignee = currentUser() ORDER BY updated DESC`;

    const response = await this.fetch("search/jql", {
      method: "POST",
      body: JSON.stringify({
        jql,
        fields: ["summary"],
        maxResults: 20,
      }),
    });

    const data = (await response.json()) as { issues: { key: string; fields: { summary: string } }[] };

    return (data.issues || []).map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
    }));
  }

  async submitWorklog(worklog: Worklog): Promise<void> {
    const adfComment = worklog.description
      ? {
          version: 1,
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: worklog.description,
                },
              ],
            },
          ],
        }
      : undefined;

    const body = {
      timeSpentSeconds: worklog.durationSeconds,
      started: new Date(worklog.startTime).toISOString().replace("Z", "+0000"),
      comment: adfComment,
    };

    await this.fetch(`issue/${worklog.taskId}/worklog`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

export const jiraClient = new JiraClient();
