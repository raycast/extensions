import { match, P } from "ts-pattern";

export interface GithubNotification {
  id: string;
  repository: GithubRepositorySummary;
  subject: GithubNotificationSubject;
  reason: string;
  unread: boolean;
  updated_at: Date;
  last_read_at?: Date;
  url: string;
  subscription_url: string;
  item?: GithubNotificationItem;
}

export function getGithubNotificationHtmlUrl(notification: GithubNotification): string {
  return match(notification.item)
    .with({ type: "GithubPullRequest", content: P.select() }, (pr) => pr.url)
    .with({ type: "GithubDiscussion", content: P.select() }, (discussion) => discussion.url)
    .otherwise(() => getHtmlUrlFromApiUrl(notification.subject.url) ?? getHtmlUrlFromMetadata(notification));
}

function getHtmlUrlFromApiUrl(apiUrl: string | undefined): string | undefined {
  if (!apiUrl) {
    return undefined;
  }
  const url = new URL(apiUrl);
  if (url.host === "api.github.com" && url.pathname.startsWith("/repos")) {
    const result = new URL(apiUrl);
    result.host = "github.com";
    result.pathname = url.pathname.replace("/repos", "").replace("/pulls/", "/pull/");
    return result.toString();
  }
  return undefined;
}

function getHtmlUrlFromMetadata(notification: GithubNotification): string {
  return match(notification.subject.type)
    .with("CheckSuite", () => {
      const result = new URL(notification.repository.url);
      result.pathname = `${result.pathname}/actions`;
      return result.toString();
    })
    .otherwise(() => notification.repository.url);
}

export interface GithubNotificationSubject {
  title: string;
  url?: string;
  latest_comment_url?: string;
  type: string;
}

export type GithubNotificationItem =
  | { type: "GithubPullRequest"; content: GithubPullRequest }
  | { type: "GithubDiscussion"; content: GithubDiscussion };

export interface GithubPullRequest {
  id: string;
  number: number;
  url: string;
  title: string;
  body: string;
  state: GithubPullRequestState;
  is_draft: boolean;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
  merged_at?: Date;
  mergeable_state: GithubMergeableState;
  merge_state_status: GithubMergeStateStatus;
  merged_by?: GithubActor;
  deletions: number;
  additions: number;
  changed_files: number;
  labels: Array<GithubLabel>;
  comments_count: number;
  comments: Array<GithubIssueComment>;
  latest_commit: GithubCommitChecks;
  base_ref_name: string;
  base_repository?: GithubRepositorySummary;
  head_ref_name: string;
  head_repository?: GithubRepositorySummary;
  author?: GithubActor;
  assignees: Array<GithubActor>;
  review_decision?: GithubPullRequestReviewDecision;
  reviews: Array<GithubPullRequestReview>;
  review_requests: Array<GithubReviewer>;
}

export enum GithubPullRequestState {
  Open = "Open",
  Closed = "Closed",
  Merged = "Merged",
}

export enum GithubMergeableState {
  Unknown = "Unknown",
  Mergeable = "Mergeable",
  Conflicting = "Conflicting",
}

export enum GithubMergeStateStatus {
  Behind = "Behind",
  Blocked = "Blocked",
  Clean = "Clean",
  Dirty = "Dirty",
  Draft = "Draft",
  HasHooks = "HasHooks",
  Unknown = "Unknown",
  Unstable = "Unstable",
}

export type GithubActor =
  | { type: "GithubUserSummary"; content: GithubUserSummary }
  | { type: "GithubBotSummary"; content: GithubBotSummary };

export function getGithubActorName(actor?: GithubActor): string {
  if (!actor) {
    return "Unknown";
  }
  switch (actor.type) {
    case "GithubUserSummary":
      return actor.content.name ? actor.content.name : actor.content.login;
    case "GithubBotSummary":
      return actor.content.login;
  }
}

export interface GithubUserSummary {
  name?: string;
  login: string;
  avatar_url: string;
}

export interface GithubBotSummary {
  login: string;
  avatar_url: string;
}

export interface GithubTeamSummary {
  avatar_url?: string;
  name: string;
}

export interface GithubMannequinSummary {
  avatar_url: string;
  login: string;
}

export interface GithubLabel {
  name: string;
  color: string;
  description?: string;
}

export interface GithubIssueComment {
  url: string;
  body: string;
  created_at: Date;
  author?: GithubActor;
}

export interface GithubCommitChecks {
  git_commit_id: string;
  check_suites?: Array<GithubCheckSuite>;
}

export interface GithubCheckSuite {
  check_runs: Array<GithubCheckRun>;
  conclusion?: GithubCheckConclusionState;
  status: GithubCheckStatusState;
  workflow?: GithubWorkflow;
  app: GithubCheckSuiteApp;
}

export interface GithubCheckRun {
  name: string;
  conclusion?: GithubCheckConclusionState;
  status: GithubCheckStatusState;
  url?: string;
}

export enum GithubCheckConclusionState {
  ActionRequired = "ActionRequired",
  Cancelled = "Cancelled",
  Failure = "Failure",
  Neutral = "Neutral",
  Skipped = "Skipped",
  Stale = "Stale",
  StartupFailure = "StartupFailure",
  Success = "Success",
  TimedOut = "TimedOut",
}

export enum GithubCheckStatusState {
  Completed = "Completed",
  InProgress = "InProgress",
  Pending = "Pending",
  Queued = "Queued",
  Requested = "Requested",
  Waiting = "Waiting",
}

export interface GithubWorkflow {
  name: string;
  url: string;
}

export interface GithubCheckSuiteApp {
  name: string;
  logo_url?: string;
  url: string;
}

export interface GithubRepositorySummary {
  name_with_owner: string;
  url: string;
}

export enum GithubPullRequestReviewDecision {
  Approved = "Approved",
  ChangesRequested = "ChangesRequested",
  ReviewRequired = "ReviewRequired",
}

export interface GithubPullRequestReview {
  author?: GithubActor;
  body: string;
  state: GithubPullRequestReviewState;
}

export enum GithubPullRequestReviewState {
  Approved = "Approved",
  ChangesRequested = "ChangesRequested",
  Commented = "Commented",
  Dismissed = "Dismissed",
  Pending = "Pending",
}

export type GithubReviewer =
  | { type: "GithubUserSummary"; content: GithubUserSummary }
  | { type: "GithubTeamSummary"; content: GithubTeamSummary }
  | { type: "GithubBotSummary"; content: GithubBotSummary }
  | { type: "GithubMannequinSummary"; content: GithubMannequinSummary };

export interface GithubDiscussion {
  id: string;
  number: number;
  url: string;
  title: string;
  body: string;
  repository: GithubRepositorySummary;
  state_reason?: GithubDiscussionStateReason;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
  labels: Array<GithubLabel>;
  comments_count: number;
  author?: GithubActor;
  answer_chosen_at?: Date;
  answer_chosen_by?: GithubActor;
  answer?: GithubDiscussionComment;
}

export enum GithubDiscussionStateReason {
  Duplicate = "Duplicate",
  Outdated = "Outdated",
  Reopened = "Reopened",
  Resolved = "Resolved",
}

export interface GithubDiscussionComment {
  url: string;
  body: string;
  created_at: Date;
  author?: GithubActor;
}
