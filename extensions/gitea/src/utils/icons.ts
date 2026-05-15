import { Color, Icon } from "@raycast/api";
import { IssueState, NotificationSubjectType } from "../types/api";
import type { NotificationThread, PullRequestMeta } from "../types/api";

type IconResult = { source: string | Icon; tintColor?: Color };

const fallback: IconResult = { source: Icon.Dot, tintColor: Color.SecondaryText };

const issue_open: IconResult = { source: "icon/issue-open.svg", tintColor: Color.Green };
const issue_closed: IconResult = { source: "icon/issue-closed.svg", tintColor: Color.Red };
export function getIssueIcon(state?: string): IconResult {
  const normalized = state?.toLowerCase();
  switch (normalized) {
    case IssueState.Open:
      return issue_open;
    case IssueState.Closed:
      return issue_closed;
    default:
      return fallback;
  }
}

const pr_open: IconResult = { source: "icon/pr-open.svg", tintColor: Color.Green };
const pr_closed: IconResult = { source: "icon/pr-closed.svg", tintColor: Color.Red };
const pr_draft: IconResult = { source: "icon/pr-draft.svg", tintColor: Color.SecondaryText };
const pr_merged: IconResult = { source: "icon/pr-merged.svg", tintColor: Color.Purple };
export function getPullRequestIcon(state?: string, title?: string, meta?: PullRequestMeta): IconResult {
  const normalized = state?.toLowerCase();
  if (state == IssueState.Merged && meta?.merged) {
    console.log(title, state, meta);
  }
  switch (normalized) {
    case IssueState.Open:
      return meta?.draft ? pr_draft : pr_open;
    case IssueState.Closed:
      return meta?.merged ? pr_merged : pr_closed;
    case IssueState.Merged:
      return pr_merged;
    default:
      return fallback;
  }
}

export function getNotificationIcon(notification: NotificationThread): IconResult {
  const subject = notification.subject;
  if (!subject) return fallback;

  const subjectType = subject.type?.toLowerCase();
  const subjectState = subject.state?.toLowerCase();

  switch (subjectType) {
    case NotificationSubjectType.Issue:
      return getIssueIcon(subjectState);
    case NotificationSubjectType.Pull:
      return getPullRequestIcon(subjectState, subject.title, undefined);
    default:
      return fallback;
  }
}
