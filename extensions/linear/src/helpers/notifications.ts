import { Icon, Image } from "@raycast/api";
import * as emojis from "node-emoji";
import { NotificationResult } from "../api/getNotifications";
import { getStatusIcon, StateType } from "./states";

enum IssueNotificationType {
  issueAssignedToYou = "issueAssignedToYou",
  issueUnassignedFromYou = "issueUnassignedFromYou",
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
  issueReminder = "issueReminder",
}

enum ProjectNotificationType {
  projectUpdatePrompt = "projectUpdatePrompt",
  projectUpdateMentionPrompt = "projectUpdateMentionPrompt",
  projectUpdateCreated = "projectUpdateCreated",
  projectAddedAsMember = "projectAddedAsMember",
  projectUpdateReaction = "projectUpdateReaction",
  projectUpdateNewComment = "projectUpdateNewComment",
}

enum DocumentNotificationType {
  documentMention = "documentMention",
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
  [IssueNotificationType.issueCommentMention]: Icon.AtSymbol,
  [IssueNotificationType.issueMention]: Icon.AtSymbol,
  [IssueNotificationType.issueDue]: Icon.Calendar,
  [IssueNotificationType.issueSubscribed]: Icon.Bell,
  [IssueNotificationType.issueReminder]: Icon.Clock,
  [ProjectNotificationType.projectUpdatePrompt]: Icon.Heartbeat,
  [ProjectNotificationType.projectUpdateMentionPrompt]: Icon.Bubble,
  [ProjectNotificationType.projectUpdateCreated]: Icon.Heartbeat,
  [ProjectNotificationType.projectAddedAsMember]: Icon.AddPerson,
  [ProjectNotificationType.projectUpdateReaction]: Icon.Emoji,
  [ProjectNotificationType.projectUpdateNewComment]: Icon.Bubble,
  [DocumentNotificationType.documentMention]: Icon.AtSymbol,
};

export function getNotificationIcon(notification: NotificationResult) {
  if (notification.issue) {
    if (notification.type === IssueNotificationType.issueStatusChanged) {
      return getStatusIcon(notification.issue.state) || Icon.Pencil;
    }

    if (notification.type === IssueNotificationType.issueCommentReaction && notification.reactionEmoji) {
      return emojis.get(notification.reactionEmoji) || Icon.Bubble;
    }
  }

  return notificationIcons[notification.type];
}

const notificationTitles: Record<string, string> = {
  [IssueNotificationType.issueAssignedToYou]: "Assigned",
  [IssueNotificationType.issueUnassignedFromYou]: "Unassigned",
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
  [IssueNotificationType.issueReminder]: "Reminded about the issue",
  [ProjectNotificationType.projectUpdatePrompt]: "Reminded to provide a project update",
  [ProjectNotificationType.projectUpdateMentionPrompt]: "Mentioned in a project update",
  [ProjectNotificationType.projectUpdateCreated]: "New project update",
  [ProjectNotificationType.projectAddedAsMember]: "Added as a project member",
  [ProjectNotificationType.projectUpdateReaction]: "New reaction to a project update",
  [ProjectNotificationType.projectUpdateNewComment]: "New reply",
  [DocumentNotificationType.documentMention]: "Mentioned",
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

export function getNotificationMenuBarTitle(unreadNotifications: NotificationResult[]) {
  return unreadNotifications.length !== 0 ? String(unreadNotifications.length) : undefined;
}

export function getNotificationURL(notification: NotificationResult) {
  if (notification.comment?.url) return notification.comment.url;
  if (notification.projectUpdate?.url) return notification.projectUpdate.url;
  if (notification.project?.url) return notification.project.url;
  if (notification.issue?.url) return notification.issue.url;
}
