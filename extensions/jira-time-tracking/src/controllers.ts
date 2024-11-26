import { parseDate } from "./utils";
import { jiraRequest } from "./requests";
import { issuesValidator, paginationValidator, projectsValidator } from "./validators";
import { getPreferenceValues } from "@raycast/api";
import { Project } from "./types";

// Helper to define the structure for isJiraCloud
type UserPreferences = {
  isJiraCloud: string; // Changed from boolean to string
};

const userPrefs = getPreferenceValues<UserPreferences>();

// Helper function to determine the correct API path based on Jira type
function getApiPath(path: string): string {
  const isJiraCloud = userPrefs.isJiraCloud === "cloud"; //
  const version = isJiraCloud ? "3" : "2";

  // Customize endpoint paths for version compatibility
  if (!isJiraCloud) {
    if (path.includes("/project/search")) {
      path = path.replace("/rest/api/3/project/search", "/rest/api/2/project");
    } else if (path.includes("/search")) {
      path = path.replace("/rest/api/3/search", "/rest/api/2/search");
    } else {
      path = path.replace("/rest/api/3", `/rest/api/${version}`);
    }
  }
  return path;
}

export const getProjects = async (begin: number) => {
  const basePath = `/rest/api/3/project/search?maxResults=500&startAt=${begin}`;
  const apiPath = getApiPath(basePath);
  console.log(`Fetching projects from: ${apiPath}`); // Debugging log
  const response = await jiraRequest(apiPath);
  console.log(`Response from Jira: ${JSON.stringify(response)}`); // Debugging log
  return {
    total: handlePaginationResp(response),
    data: handleProjectResp(response),
  };
};

export const getIssues = async (begin: number, projectId?: string) => {
  const jql = projectId ? `&jql=project=${projectId}` : "";
  const basePath = `/rest/api/3/search?fields=summary,parent,project&maxResults=500&startAt=${begin}${jql}`;
  const apiPath = getApiPath(basePath);
  const response = await jiraRequest(apiPath);
  return {
    total: handlePaginationResp(response),
    data: handleIssueResp(response),
  };
};

const handlePaginationResp = (resp: unknown) => {
  return paginationValidator(resp) ? resp.total : 0;
};

const handleProjectResp = (resp: any): Project[] => {
  // Validate the response and determine the structure
  if (!projectsValidator(resp)) {
    console.error("Invalid project response format:", resp);
    return []; // Return an empty array if validation fails
  }
  // If the validator passed, handle both potential response structures
  if (Array.isArray(resp)) {
    // Handle the array structure (v2 response)
    return resp.map((project) => ({
      key: project.key,
      name: project.name.trim(),
    }));
  } else if (resp.values) {
    // Handle the object with 'values' property (v3 response)
    return resp.values.map((project) => ({
      key: project.key,
      name: project.name,
    }));
  } else {
    // This case should not occur since the validator has passed, but it's safe to handle it
    console.error("Unexpected project response structure:", resp);
    return [];
  }
};

const handleIssueResp = (resp: unknown) => {
  return issuesValidator(resp) ? resp.issues : [];
};

export const postTimeLog = async (timeSpentSeconds: number, issueId: string, description: string, startedAt: Date) => {
  const basePath = `/rest/api/3/issue/${issueId}/worklog?notifyUsers=false`;
  const apiPath = getApiPath(basePath);

  const isJiraCloud = userPrefs.isJiraCloud === "cloud";

  const comment = isJiraCloud
    ? {
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
      }
    : description;

  const body = JSON.stringify({
    timeSpentSeconds,
    comment, // Use the conditionally formatted comment
    started: parseDate(startedAt),
  });

  const success = await jiraRequest(apiPath, body, "POST");
  return success;
};
