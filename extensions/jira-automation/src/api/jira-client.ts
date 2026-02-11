import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  jiraUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
      id: string;
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    priority: {
      name: string;
      iconUrl: string;
    };
    parent?: {
      fields: {
        summary: string;
      };
    };
  };
}

export interface JiraUser {
  accountId: string;
  displayName: string;
}

export interface Transition {
  id: string;
  name: string;
}

export interface Worklog {
  id: string;
  issueId: string;
  comment?: string;
  timeSpent: string;
  timeSpentSeconds: number;
  started: string;
  issueKey?: string;
  issueSummary?: string;
}

const getAuthHeader = () => {
  const { email, apiToken } = getPreferenceValues<Preferences>();
  const encoded = Buffer.from(`${email}:${apiToken}`).toString("base64");
  return `Basic ${encoded}`;
};

const getJiraClient = () => {
  const { jiraUrl } = getPreferenceValues<Preferences>();
  return axios.create({
    baseURL: `${jiraUrl.replace(/\/$/, "")}/rest/api/3`,
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
};

export const fetchCurrentUser = async (): Promise<JiraUser> => {
  const client = getJiraClient();
  const response = await client.get("/myself");
  return response.data;
};

export const fetchAssignedTickets = async (): Promise<JiraIssue[]> => {
  const client = getJiraClient();
  const jql = `assignee = currentUser() AND status IN ("To Do", "In Progress", "In Review", "Selected for Development") ORDER BY updated DESC`;
  const response = await client.get("/search/jql", {
    params: {
      jql,
      maxResults: 50,
      fields: "summary,status,issuetype,priority,description,parent",
    },
  });
  return response.data.issues;
};

export const fetchIssuesByKeys = async (keys: string[]): Promise<JiraIssue[]> => {
  const client = getJiraClient();
  const keysStr = keys.map((k) => `"${k}"`).join(",");
  const jql = `key IN (${keysStr})`;
  const response = await client.get("/search/jql", {
    params: {
      jql,
      fields: "summary,status,issuetype,priority,description",
    },
  });
  return response.data.issues;
};

export const logWorkAcrossIssues = async (
  issueKeys: string[],
  timeSpent: string,
  comment?: string,
  started?: string
): Promise<{ key: string; success: boolean; error?: string }[]> => {
  const client = getJiraClient();
  const results = [];

  for (const key of issueKeys) {
    try {
      await client.post(`/issue/${key}/worklog`, {
        timeSpent,
        started,
        comment: comment
          ? {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: comment }],
                },
              ],
            }
          : undefined,
      });
      results.push({ key, success: true });
    } catch (error: any) {
      results.push({
        key,
        success: false,
        error: error.response?.data?.errorMessages?.[0] || error.message,
      });
    }
  }

  return results;
};

export const updateIssueStatus = async (issueKey: string, transitionId: string): Promise<void> => {
  const client = getJiraClient();
  await client.post(`/issue/${issueKey}/transitions`, {
    transition: { id: transitionId },
  });
};

export const fetchTransitions = async (issueKey: string): Promise<Transition[]> => {
  const client = getJiraClient();
  const response = await client.get(`/issue/${issueKey}/transitions`);
  return response.data.transitions;
};

export const fetchWorklogsReport = async (startDate: string, endDate: string): Promise<Worklog[]> => {
  const client = getJiraClient();
  const user = await fetchCurrentUser();

  // Jira API v3 search for worklogs by user and date range is tricky.
  // There's no direct "search worklogs" API with JQL for worklog date.
  // We usually search for issues updated in that range and then filter worklogs.
  const jql = `worklogAuthor = currentUser() AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;
  const issuesResponse = await client.get("/search/jql", {
    params: {
      jql,
      maxResults: 100,
      fields: "summary,worklog",
    },
  });

  const allWorklogs: Worklog[] = [];
  const issues = issuesResponse.data.issues;

  for (const issue of issues) {
    let issueWorklogs = issue.fields.worklog.worklogs;

    // If there are more worklogs than returned in the search results, fetch them all
    if (issue.fields.worklog.total > issueWorklogs.length) {
      try {
        const wlResponse = await client.get(`/issue/${issue.key}/worklog`);
        issueWorklogs = wlResponse.data.worklogs;
      } catch (error) {
        console.error(`Failed to fetch all worklogs for ${issue.key}`, error);
      }
    }

    for (const wl of issueWorklogs) {
      if (wl.author.accountId === user.accountId) {
        const wlDate = wl.started.split("T")[0];
        if (wlDate >= startDate && wlDate <= endDate) {
          allWorklogs.push({
            id: wl.id,
            issueId: issue.id,
            issueKey: issue.key,
            issueSummary: issue.fields.summary,
            timeSpent: wl.timeSpent,
            timeSpentSeconds: wl.timeSpentSeconds,
            comment: wl.comment?.content?.[0]?.content?.[0]?.text,
            started: wl.started,
          });
        }
      }
    }
  }

  return allWorklogs;
};
