import { IssueBody, ProjectBody, JiraErrorResponseBody, PaginationBody } from "./types";

export const projectsValidator = (body: unknown): body is ProjectBody => {
  if (Array.isArray(body)) {
    // API v2 structure: an array of project objects
    return body.every(
      (project) =>
        Object.prototype.hasOwnProperty.call(project, "key") && Object.prototype.hasOwnProperty.call(project, "name"),
    );
  } else if (typeof body === "object" && body !== null && "values" in body) {
    // API v3 structure: an object with a 'values' property containing an array of project objects
    const partial = body as { values: unknown };
    return (
      Array.isArray(partial.values) &&
      partial.values.every(
        (project) =>
          Object.prototype.hasOwnProperty.call(project, "key") && Object.prototype.hasOwnProperty.call(project, "name"),
      )
    );
  }
  return false;
};

export const issuesValidator = (body: unknown): body is IssueBody => {
  if (typeof body === "object" && body !== null && "issues" in body) {
    const partial = body as { issues: unknown };
    return Array.isArray(partial.issues);
  }
  return false;
};

export const paginationValidator = (body: unknown): body is PaginationBody => {
  return typeof body === "object" && body !== null && "total" in body && "startAt" in body && "maxResults" in body;
};

export const isJiraErrorResponseBody = (body: unknown): body is JiraErrorResponseBody =>
  typeof body === "object" && body !== null && ("message" in body || "messages" in body);
