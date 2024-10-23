import { RestEndpointMethodTypes } from "@octokit/rest";
import { Color, Icon, Image } from "@raycast/api";
import { format } from "date-fns";

import { getGitHubClient } from "../api/githubClient";
import { Discussion } from "../generated/graphql";

export type Notification =
  RestEndpointMethodTypes["activity"]["listNotificationsForAuthenticatedUser"]["response"]["data"][0];

// from https://github.com/manosim/gitify/blob/c3683dcfd84afc74fd391b2b17ae7b36dfe779a7/src/utils/helpers.ts#L19-L27
function generateNotificationReferrerId(notificationId: string, userId: string) {
  const buffer = Buffer.from(`018:NotificationThread${notificationId}:${userId}`);
  return `notification_referrer_id=${buffer.toString("base64")}`;
}

export function generateGitHubUrl(url: string, notificationId: string, userId?: string, comment = "") {
  let newUrl: string = url.replace("api.github.com/repos", "github.com");

  if (newUrl.indexOf("/pulls/") !== -1) {
    newUrl = newUrl.replace("/pulls/", "/pull/");
  }

  if (newUrl.indexOf("/releases/") !== -1) {
    newUrl = newUrl.replace("/repos", "");
    newUrl = newUrl.substring(0, newUrl.lastIndexOf("/"));
  }

  if (userId) {
    const notificationReferrerId = generateNotificationReferrerId(notificationId, userId);

    return `${newUrl}?${notificationReferrerId}${comment}`;
  }

  return newUrl;
}

const getCommentId = (url?: string) => (url ? /comments\/(?<id>\d+)/g.exec(url)?.groups?.id : undefined);

export async function getGitHubURL(notification: Notification, userId?: string) {
  if (notification.subject.url) {
    const latestCommentId = getCommentId(notification.subject.latest_comment_url);
    return generateGitHubUrl(
      notification.subject.url,
      notification.id,
      userId,
      latestCommentId ? "#issuecomment-" + latestCommentId : undefined,
    );
  } else if (notification.subject.type === "CheckSuite") {
    return generateGitHubUrl(`${notification.repository.html_url}/actions`, notification.id, userId);
  } else if (notification.subject.type === "Discussion") {
    // Get the discussion number via GraphQL
    // See: https://github.com/orgs/community/discussions/62728#discussioncomment-9034908
    let discussionNumber: number | null = null;
    try {
      discussionNumber = await getGitHubDiscussionNumber(notification);
    } catch (error) {
      console.error("Failed to get discussion number", error);
    }

    return generateGitHubUrl(
      `${notification.repository.html_url}/discussions/${discussionNumber ?? ""}`,
      notification.id,
      userId,
    );
  }

  return notification.url;
}

export async function getNotificationIcon(notification: Notification): Promise<{ value: Image; tooltip: string }> {
  if (notification.subject.type === "PullRequest") {
    const { octokit } = getGitHubClient();
    const pullRequest = await octokit.pulls.get({
      owner: notification.repository.owner.login,
      repo: notification.repository.name,
      pull_number: parseInt(notification.subject.url.split("/").at(-1)!),
    });

    if (pullRequest.data.merged) {
      return { value: { source: "pull-request-merged.svg", tintColor: Color.Purple }, tooltip: "Merged" };
    } else if (pullRequest.data.state === "closed") {
      return { value: { source: "pull-request-closed.svg", tintColor: Color.Red }, tooltip: "Closed" };
    } else if (pullRequest.data.draft) {
      return { value: { source: "pull-request-draft.svg", tintColor: Color.SecondaryText }, tooltip: "Draft" };
    } else {
      return { value: { source: "pull-request-open.svg", tintColor: Color.Green }, tooltip: "Open" };
    }
  }

  if (notification.subject.type === "Issue") {
    const { octokit } = getGitHubClient();
    const issue = await octokit.rest.issues.get({
      owner: notification.repository.owner.login,
      repo: notification.repository.name,
      issue_number: parseInt(notification.subject.url.split("/").at(-1)!),
    });

    if (issue.data.state === "closed") {
      if (issue.data.state_reason === "completed") {
        return { value: { source: "issue-closed.svg", tintColor: Color.Purple }, tooltip: "Closed as completed" };
      } else if (issue.data.state_reason === "not_planned") {
        return { value: { source: "skip.svg", tintColor: Color.SecondaryText }, tooltip: "Closed as not planned" };
      } else {
        return { value: { source: "issue-closed.svg", tintColor: Color.Purple }, tooltip: "Closed" };
      }
    } else {
      return { value: { source: "issue-open.svg", tintColor: Color.Green }, tooltip: "Open" };
    }
  }

  let icon;

  switch (notification.subject.type) {
    case "Commit":
      icon = { value: { source: "commit.svg" }, tooltip: "Commit" };
      break;
    case "Release":
      icon = { value: { source: "tag.svg", tintColor: Color.Blue }, tooltip: "Release" };
      break;
    case "CheckSuite":
      icon = {
        value: notification.subject.title.match(/(succeeded)/i)
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : notification.subject.title.match(/(failed)/i)
            ? { source: Icon.XMarkCircle, tintColor: Color.Red }
            : notification.subject.title.match(/(skipped|cancelled)/i)
              ? { source: "skip.svg", tintColor: Color.SecondaryText }
              : { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText },
        tooltip: "Workflow Run",
      };
      break;
    case "Discussion":
      icon = { value: { source: "comment-discussion.svg" }, tooltip: "Comment" };
      break;
    case "RepositoryInvitation":
      icon = { value: { source: "mail.svg" }, tooltip: "Repository Invitation" };
      break;
    case "RepositoryVulnerabilityAlert":
      icon = { value: { source: "alert.svg" }, tooltip: "Repository} Vulnerability Alert" };
      break;
    default:
      icon = { value: { source: Icon.Circle }, tooltip: "Unknown" };
      break;
  }

  icon.tooltip = `Subject type: ${icon.tooltip}`;
  return icon;
}

export function getNotificationTypeTitle(notification: Notification): string {
  switch (notification.subject.type) {
    case "PullRequest":
      return "Pull Request";
    case "CheckSuite":
      return "Check Suite";
    case "RepositoryInvitation":
      return "Repository Invitation";
    case "RepositoryVulnerabilityAlert":
      return "Repository Vulnerability Alert";
    default:
      return notification.subject.type;
  }
}

export function getNotificationSubtitle(notification: Notification) {
  const reason = getNotificationReason(notification);
  const numberTag = getIssueOrPrNumberTag(notification);

  return numberTag
    ? `${numberTag} ･ ${notification.repository.full_name} ･ ${reason}`
    : `${notification.repository.full_name} ･ ${reason}`;
}

export function getNotificationReason(notification: Notification) {
  switch (notification.reason) {
    case "assign":
      return "Assigned";
    case "author":
      return "Author";
    case "comment":
      return "Commented";
    case "ci_activity":
      return "CI Activity";
    case "invitation":
      return "Invited";
    case "manual":
      return "Subscribed";
    case "mention":
      return "Mentioned";
    case "review_requested":
      return "Review Requested";
    case "security_alert":
      return "Security Alert";
    case "state_change":
      return "Changed";
    case "subscribed":
      return "Watching";
    case "team_mention":
      return "Team Mentioned";
    default:
      return "";
  }
}

export function getIssueOrPrNumberTag(notification: Notification) {
  if (notification.subject.type !== "Issue" && notification.subject.type !== "PullRequest") return;

  const id = notification.subject.url?.split("/").at(-1);
  return id ? `#${id}` : undefined;
}

export function getNotificationTooltip(date: Date) {
  return `Updated: ${format(date, "EEEE d MMMM yyyy 'at' HH:mm")}`;
}

export function getGitHubIcon(isUnread = false) {
  return {
    source: isUnread ? "github-unread.svg" : "github.svg",
    tintColor: Color.PrimaryText,
  };
}

export async function getGitHubDiscussionNumber(notification: Notification) {
  const { github } = getGitHubClient();
  const repo = notification.repository.full_name;
  const updated = notification.updated_at.split("T")[0];
  const title = notification.subject.title;

  const result = await github.getGitHubDiscussionNumber({
    filter: `repo:${repo} updated:>=${updated} in:title ${title}`,
  });

  const data = result?.search?.nodes?.[0] as Discussion | null;

  return data?.number ?? null;
}
