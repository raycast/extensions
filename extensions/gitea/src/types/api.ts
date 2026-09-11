import type { components } from "./gitea";

type Schemas = components["schemas"];

export type Repository = Schemas["Repository"];
export type Issue = Schemas["Issue"];
export type User = Schemas["User"];
export type Label = Schemas["Label"];
export type Milestone = Schemas["Milestone"];
export type NotificationThread = Schemas["NotificationThread"];
export type NotificationSubject = Schemas["NotificationSubject"];
export type PullRequestMeta = Schemas["PullRequestMeta"];
export type RepositoryMeta = Schemas["RepositoryMeta"];
export type SearchResults = Schemas["SearchResults"];

export const IssueState = {
  Open: "open",
  Closed: "closed",
  Merged: "merged",
} as const;
export type IssueState = (typeof IssueState)[keyof typeof IssueState];
export type StateType = IssueState;

export const NotificationSubjectType = {
  Issue: "issue",
  Pull: "pull",
  Commit: "commit",
  Repository: "repository",
} as const;
export type NotificationSubjectType = (typeof NotificationSubjectType)[keyof typeof NotificationSubjectType];
