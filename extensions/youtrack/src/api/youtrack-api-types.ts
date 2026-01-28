import type { Issue, Project, EntityBase } from "youtrack-client";
import type {
  workItemFields,
  extendedIssuesFields,
  issuesFields,
  projectFields,
  issueWorkItemFields,
  userFields,
  commandListFields,
  commentFields,
} from "./youtrack-api-fields";

export type IssuesFields = typeof issuesFields;
export type ExtendedIssuesFields = typeof extendedIssuesFields;
export type ProjectFields = typeof projectFields;

export type WorkItemFields = typeof workItemFields;
export type IssueWorkItemFields = typeof issueWorkItemFields;
export type UserFields = typeof userFields;
export type CommandListFields = typeof commandListFields;

export type ReducedApiIssue = Pick<
  Issue,
  "summary" | "created" | "updated" | "numberInProject" | "project" | "resolved" | "description"
>;
export type ReducedApiProject = EntityBase & Pick<Project, "name" | "shortName">;

export type IssueComment = typeof commentFields;
