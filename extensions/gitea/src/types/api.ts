export type {
  Issue,
  Label,
  Milestone,
  NotificationSubject,
  NotificationThread,
  Organization,
  PullRequestMeta,
  Repository,
  RepositoryMeta,
  SearchResults,
  User,
} from "@go-gitea/sdk.js";

export const IssueState = {
  Open: "open",
  Closed: "closed",
  Merged: "merged",
} as const;
export type IssueState = (typeof IssueState)[keyof typeof IssueState];

export const NotificationSubjectType = {
  Issue: "issue",
  Pull: "pull",
  Commit: "commit",
  Repository: "repository",
} as const;
export type NotificationSubjectType = (typeof NotificationSubjectType)[keyof typeof NotificationSubjectType];
