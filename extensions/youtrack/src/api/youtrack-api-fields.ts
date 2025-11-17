import type {
  CommandList,
  Issue,
  IssueComment,
  IssueWorkItem,
  Project,
  ProjectCustomField,
  Schema,
  StateBundleElement,
  Tag,
  User,
  WorkItemType,
} from "youtrack-client";

const defaultFields = ["id"] as const;

function withDefaultFields<T extends readonly unknown[]>(fields: T) {
  return [...defaultFields, ...fields] as const;
}

const issueDefaultFields = [
  "summary",
  "created",
  "updated",
  "resolved",
  "description",
  "idReadable",
  { customFields: ["name", "id", { value: ["name", { color: ["background", "foreground"] }] }] },
  { project: ["id", "name", "shortName"] },
] as const;

export const userFields = withDefaultFields(["fullName", "login", "avatarUrl", "email"]) satisfies Schema<User>;

export const issuesFields = withDefaultFields(issueDefaultFields) satisfies Schema<Issue>;

export const extendedIssuesFields = withDefaultFields([
  ...issueDefaultFields,
  { attachments: ["name", "url"] },
  { reporter: userFields },
  { updater: userFields },
  { customFields: [{ value: ["login", "fullName", "avatarUrl"] }, "name"] },
  { tags: ["name", "id", { color: ["foreground", "background"] }] },
] as const) satisfies Schema<Issue>;

export const createIssueFields = withDefaultFields([
  "idReadable",
  "description",
  "summary",
  "numberInProject",
  { tags: ["name"] },
  { project: ["shortName"] },
]) satisfies Schema<Issue>;

export const projectCustomFields = withDefaultFields([{ field: ["name"] }]) satisfies Schema<ProjectCustomField>;

export const projectFields = withDefaultFields([
  "name",
  "shortName",
  { customFields: projectCustomFields },
]) satisfies Schema<Project>;

export const stateBundleFields = withDefaultFields([
  "id",
  "name",
  "archived",
  "description",
  "isResolved",
  { color: ["background", "foreground"] },
]) satisfies Schema<StateBundleElement>;

export const tagsFields = withDefaultFields(["name", { color: ["background", "foreground"] }]) satisfies Schema<Tag>;

export const workItemFields = withDefaultFields(["name", "autoAttached"]) satisfies Schema<WorkItemType>;

export const issueWorkItemFields = withDefaultFields([
  "text",
  { duration: ["minutes", "presentation"] },
  { type: ["name", "autoAttached"] },
]) satisfies Schema<IssueWorkItem>;

export const commandListFields = withDefaultFields([
  { commands: ["error", "description"] },
]) satisfies Schema<CommandList>;

export const commentFields = withDefaultFields([
  "text",
  "created",
  { author: userFields, attachments: ["name", "url"] },
]) satisfies Schema<IssueComment>;
