import { IssueBody, Project, ProjectBody, PaginationBody, WorklogBody } from "./types";
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isProject = (value: unknown): value is Project =>
  isRecord(value) && typeof value.key === "string" && typeof value.name === "string";
export const paginationValidator = (body: unknown): body is PaginationBody =>
  isRecord(body) &&
  typeof body.total === "number" &&
  Number.isFinite(body.total) &&
  body.total >= 0 &&
  typeof body.startAt === "number" &&
  Number.isFinite(body.startAt) &&
  body.startAt >= 0 &&
  typeof body.maxResults === "number" &&
  Number.isFinite(body.maxResults) &&
  body.maxResults >= 0;
export const projectsValidator = (body: unknown): body is ProjectBody =>
  Array.isArray(body)
    ? body.every(isProject)
    : isRecord(body) && Array.isArray(body.values) && body.values.every(isProject) && paginationValidator(body);
export const issuesValidator = (body: unknown): body is IssueBody =>
  isRecord(body) &&
  Array.isArray(body.issues) &&
  body.issues.every(
    (issue) =>
      isRecord(issue) &&
      typeof issue.key === "string" &&
      isRecord(issue.fields) &&
      typeof issue.fields.summary === "string" &&
      (issue.fields.project === undefined || isProject(issue.fields.project)),
  ) &&
  (body.nextPageToken === undefined || body.nextPageToken === null || typeof body.nextPageToken === "string");
export const worklogsValidator = (body: unknown): body is WorklogBody =>
  isRecord(body) &&
  Array.isArray(body.worklogs) &&
  body.worklogs.every(
    (log) =>
      isRecord(log) &&
      typeof log.id === "string" &&
      typeof log.started === "string" &&
      !Number.isNaN(new Date(log.started).getTime()) &&
      typeof log.timeSpentSeconds === "number" &&
      Number.isFinite(log.timeSpentSeconds) &&
      isRecord(log.author) &&
      typeof log.author.displayName === "string",
  ) &&
  paginationValidator(body);
