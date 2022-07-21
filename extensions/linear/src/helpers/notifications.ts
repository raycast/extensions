import { Icon, Image } from "@raycast/api";
import emojis from "node-emoji";
import { NotificationResult } from "../api/getNotifications";
import { StateType, statusIcons } from "./states";

enum NotificationType {
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

const notificationIcons: Record<string, Image.ImageLike> = {
  [NotificationType.issueAssignedToYou]: Icon.AddPerson,
  [NotificationType.issueCreated]: Icon.Plus,
  [NotificationType.issuePriorityUrgent]: {
    source: { light: "light/priority-urgent.svg", dark: "dark/priority-urgent.svg" },
  },
  [NotificationType.issueBlocking]: Icon.ExclamationMark,
  [NotificationType.issueUnblocked]: Icon.ExclamationMark,
  [NotificationType.issueNewComment]: Icon.Bubble,
  [NotificationType.issueCommentMention]: Icon.Bubble,
  [NotificationType.issueMention]: Icon.Bubble,
  [NotificationType.issueDue]: Icon.Calendar,
  [NotificationType.issueSubscribed]: Icon.Bell,
};

export function getNotificationIcon(notification: NotificationResult) {
  if (notification.type === NotificationType.issueStatusChanged) {
    return (
      { source: statusIcons[notification.issue.state.type], tintColor: notification.issue.state.color } || Icon.Pencil
    );
  }

  if (notification.type === NotificationType.issueCommentReaction && notification.reactionEmoji) {
    return emojis.get(notification.reactionEmoji) || Icon.Bubble;
  }

  return notificationIcons[notification.type];
}

const notificationTitles: Record<string, string> = {
  [NotificationType.issueAssignedToYou]: "Assigned to you",
  [NotificationType.issueCreated]: "New issue created",
  [NotificationType.issuePriorityUrgent]: "Marked as urgent",
  [NotificationType.issueBlocking]: "Marked as blocking",
  [NotificationType.issueUnblocked]: "Marked as unblocked",
  [NotificationType.issueNewComment]: "New comment",
  [NotificationType.issueCommentMention]: "Mentioned in a comment",
  [NotificationType.issueCommentReaction]: "Reaction to a comment",
  [NotificationType.issueMention]: "Mentioned in the issue's description",
  [NotificationType.issueDue]: "Due soon, due, or overdue",
  [NotificationType.issueSubscribed]: "Subscribed to the issue",
};

export function getNotificationTitle(notification: NotificationResult) {
  if (notification.type === NotificationType.issueStatusChanged) {
    return (
      {
        [StateType.completed]: "Marked as completed",
        [StateType.canceled]: "Marked as canceled",
      }[notification.issue.state.type] || "Status changed"
    );
  }

  return notificationTitles[notification.type];
}
