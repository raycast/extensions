import { parseDate } from "./utils";
import { jiraRequest } from "./requests";
import { issuesValidator, paginationValidator, projectsValidator } from "./validators";

export const getProjects = async (begin: number) => {
  const response = await jiraRequest(`/rest/api/3/project/search?maxResults=500&startAt=${begin}`);
  return {
    total: handlePaginationResp(response),
    data: handleProjectResp(response),
  };
};

export const getIssues = async (begin: number, projectId?: string) => {
  const endpoint = `/rest/api/3/search?fields=summary,parent,project&maxResults=500&startAt=${begin}&jql=${
    projectId ? `project=${projectId}` : ""
  }`;
  const response = await jiraRequest(endpoint);
  return {
    total: handlePaginationResp(response),
    data: handleIssueResp(response),
  };
};

const handlePaginationResp = (resp: unknown) => {
  return paginationValidator(resp) ? resp.total : 0;
};

const handleProjectResp = (resp: unknown) => {
  return projectsValidator(resp) ? resp.values : [];
};

const handleIssueResp = (resp: unknown) => {
  return issuesValidator(resp) ? resp.issues : [];
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
