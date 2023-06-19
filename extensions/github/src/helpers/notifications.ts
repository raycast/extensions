import { Endpoints } from "@octokit/types";
import { Color, Icon } from "@raycast/api";
import { format } from "date-fns";

type Notification = Endpoints["GET /notifications"]["response"]["data"][0];

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

export function getGitHubURL(notification: Notification, userId?: string) {
  if (notification.subject.url) {
    const latestCommentId = getCommentId(notification.subject.latest_comment_url);
    return generateGitHubUrl(
      notification.subject.url,
      notification.id,
      userId,
      latestCommentId ? "#issuecomment-" + latestCommentId : undefined
    );
  } else if (notification.subject.type === "CheckSuite") {
    return generateGitHubUrl(`${notification.repository.html_url}/actions`, notification.id, userId);
  } else if (notification.subject.type === "Discussion") {
    return generateGitHubUrl(`${notification.repository.html_url}/discussions`, notification.id, userId);
  }

  return notification.url;
}

export function getNotificationIcon(notification: Notification) {
  let icon;

  switch (notification.subject.type) {
    case "Commit":
      icon = { value: "commit.svg", tooltip: "Commit" };
      break;
    case "Issue":
      icon = { value: "issue-opened.svg", tooltip: "Issue" };
      break;
    case "PullRequest":
      icon = { value: "pull-request.svg", tooltip: "Pull Request" };
      break;
    case "Release":
      icon = { value: "tag.svg", tooltip: "Release" };
      break;
    case "CheckSuite":
      icon = { value: Icon.CheckCircle, tooltip: "Workflow" };
      break;
    case "Discussion":
      icon = { value: "comment-discussion.svg", tooltip: "Comment" };
      break;
    case "RepositoryInvitation":
      icon = { value: "mail.svg", tooltip: "Repository Invitation" };
      break;
    case "RepositoryVulnerabilityAlert":
      icon = { value: "alert.svg", tooltip: "Repository} Vulnerability Alert" };
      break;
    default:
      icon = { value: Icon.Circle, tooltip: "Unknown" };
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

  return numberTag ? `${numberTag} ･ ${reason}` : reason;
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

export function getGitHubIcon(tinted = false) {
  const overrideTintColor = tinted ? Color.Orange : undefined;
  return {
    source: "github.svg",
    tintColor: overrideTintColor ? overrideTintColor : { light: "#000000", dark: "#FFFFFF", adjustContrast: false },
  };
}
