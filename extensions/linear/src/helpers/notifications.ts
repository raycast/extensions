import { Icon, Image } from "@raycast/api";
import emojis from "node-emoji";
import { NotificationResult } from "../api/getNotifications";
import { StateType, statusIcons } from "./states";

enum IssueNotificationType {
  issueAssignedToYou = "issueAssignedToYou",
  issueCreated = "issueCreated",
  issuePriorityUrgent = "issuePriorityUrgent",
  issueStatusChanged = "issueStatusChanged",
  issueBlocking = "issueBlocking",
  issueUnblocked = "issueUnblocked",
  issueNewComment = "issueNewComment",
  issueCommentMention = "issueCommentMention",
  issueCommentReaction = "issueCommentReaction",
  issueMention = "issueMention",
  issueDue = "issueDue",
  issueSubscribed = "issueSubscribed",
}

enum ProjectNotificationType {
  projectUpdatePrompt = "projectUpdatePrompt",
  projectUpdateMentionPrompt = "projectUpdateMentionPrompt",
}

const notificationIcons: Record<string, Image.ImageLike> = {
  [IssueNotificationType.issueAssignedToYou]: Icon.AddPerson,
  [IssueNotificationType.issueCreated]: Icon.Plus,
  [IssueNotificationType.issuePriorityUrgent]: {
    source: { light: "light/priority-urgent.svg", dark: "dark/priority-urgent.svg" },
  },
  [IssueNotificationType.issueBlocking]: Icon.ExclamationMark,
  [IssueNotificationType.issueUnblocked]: Icon.ExclamationMark,
  [IssueNotificationType.issueNewComment]: Icon.Bubble,
  [IssueNotificationType.issueCommentMention]: Icon.Bubble,
  [IssueNotificationType.issueMention]: Icon.Bubble,
  [IssueNotificationType.issueDue]: Icon.Calendar,
  [IssueNotificationType.issueSubscribed]: Icon.Bell,
  [ProjectNotificationType.projectUpdatePrompt]: Icon.Heartbeat,
  [ProjectNotificationType.projectUpdateMentionPrompt]: Icon.Bubble,
};

export function getNotificationIcon(notification: NotificationResult) {
  if (notification.issue) {
    if (notification.type === IssueNotificationType.issueStatusChanged) {
      return (
        { source: statusIcons[notification.issue.state.type], tintColor: notification.issue.state.color } || Icon.Pencil
      );
    }

    if (notification.type === IssueNotificationType.issueCommentReaction && notification.reactionEmoji) {
      return emojis.get(notification.reactionEmoji) || Icon.Bubble;
    }
  }

  return notificationIcons[notification.type];
}

const notificationTitles: Record<string, string> = {
  [IssueNotificationType.issueAssignedToYou]: "Assigned",
  [IssueNotificationType.issueCreated]: "New issue created",
  [IssueNotificationType.issuePriorityUrgent]: "Marked as urgent",
  [IssueNotificationType.issueBlocking]: "Marked as blocking",
  [IssueNotificationType.issueUnblocked]: "Marked as unblocked",
  [IssueNotificationType.issueNewComment]: "New comment",
  [IssueNotificationType.issueCommentMention]: "Mentioned",
  [IssueNotificationType.issueCommentReaction]: "Reaction to a comment",
  [IssueNotificationType.issueMention]: "Mentioned in the issue's description",
  [IssueNotificationType.issueDue]: "Due soon, due, or overdue",
  [IssueNotificationType.issueSubscribed]: "Subscribed to the issue",
  [ProjectNotificationType.projectUpdatePrompt]: "Reminded to provide a project update",
  [ProjectNotificationType.projectUpdateMentionPrompt]: "Mentioned in a project update",
};

export function getNotificationTitle(notification: NotificationResult) {
  if (notification.issue) {
    if (notification.type === IssueNotificationType.issueStatusChanged) {
      return (
        {
          [StateType.completed]: "Marked as completed",
          [StateType.canceled]: "Marked as canceled",
        }[notification.issue.state.type] || "Status changed"
      );
    }
  }

  return notificationTitles[notification.type] || "Unknown notification";
}

export function getNotificationMenuBarIcon(unreadNotifications: NotificationResult[]) {
  return {
    source: { dark: "dark/linear.svg", light: "light/linear.svg" },
    tintColor:
      unreadNotifications.length !== 0 ? { dark: "#5E6AD2", light: "#5E6AD2", adjustContrast: false } : undefined,
  };
}

export function getNotificationMenuBarTitle(unreadNotifications: NotificationResult[]) {
  return unreadNotifications.length !== 0 ? String(unreadNotifications.length) : undefined;
}
