import { IssueBody, ProjectBody, JiraErrorResponseBody } from "./types";

export const projectsValidator = (body: unknown): body is ProjectBody => {
  if (typeof body === "object" && body !== null && "values" in body) {
    const partial = body as { values: unknown };
    return Array.isArray(partial.values);
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

export const isJiraErrorResponseBody = (body: unknown): body is JiraErrorResponseBody =>
  typeof body === "object" && body !== null && ("message" in body || "messages" in body);
