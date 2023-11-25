import { parseDate } from "./utils";
import { jiraRequest } from "./requests";
import { issuesValidator, projectsValidator } from "./validators";

export const getProjects = async () => {
  const response = await jiraRequest(`/rest/api/3/project/search`);
  return projectsValidator(response) ? response.values : [];
};

export const getIssues = async (projectId?: string) => {
  const endpoint = `/rest/api/3/search?fields=summary,parent,project&maxResults=500&startAt=0&jql=${
    projectId ? "project=" + projectId : ""
  }`;
  const response = await jiraRequest(endpoint);
  return issuesValidator(response) ? response.issues : [];
};

export const postTimeLog = async (timeSpentSeconds: number, issueId: string, description: string, startedAt: Date) => {
  const body = JSON.stringify({
    timeSpentSeconds,
    comment: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              text: description,
              type: "text",
            },
          ],
        },
      ],
    },
    started: parseDate(startedAt),
  });

  const endpoint = `/rest/api/3/issue/${issueId}/worklog?notifyUsers=false`;
  const success = await jiraRequest(endpoint, body, "POST");
  return success;
};
