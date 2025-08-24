import { Icon, Image } from "@raycast/api";
import * as emojis from "node-emoji";

import { NotificationResult } from "../api/getNotifications";

import { getStatusIcon, StateType } from "./states";

enum NotificationType {
  issueCreated = "issueCreated",
  issueMention = "issueMention",
  issueAddedToTriage = "issueAddedToTriage",
  issueAssignedToYou = "issueAssignedToYou",
  issueAddedToView = "issueAddedToView",
  issueUnassignedFromYou = "issueUnassignedFromYou",
  issueNewComment = "issueNewComment",
  issueCommentMention = "issueCommentMention",
  issueCommentReaction = "issueCommentReaction",
  issueThreadResolved = "issueThreadResolved",
  issueEmojiReaction = "issueEmojiReaction",
  issuePriorityUrgent = "issuePriorityUrgent",
  issueSubscribed = "issueSubscribed",
  issueBlocking = "issueBlocking",
  issueUnblocked = "issueUnblocked",
  issueMovedToProject = "issueMovedToProject",
  issueReminder = "issueReminder",
  issueStatusChangedDone = "issueStatusChanged",
  issueStatusChangedAll = "issueStatusChangedAll",
  issueSlaHighRisk = "issueSlaHighRisk",
  issueSlaBreached = "issueSlaBreached",
  issueDue = "issueDue",
  oauthClientApprovalCreated = "oauthClientApprovalCreated",
  triageResponsibilityIssueAddedToTriage = "triageResponsibilityIssueAddedToTriage",

  // initiatives
  initiativeAddedAsOwner = "initiativeAddedAsOwner",
  initiativeCommentMention = "initiativeCommentMention",
  initiativeNewComment = "initiativeNewComment",
  initiativeThreadResolved = "initiativeThreadResolved",
  initiativeCommentReaction = "initiativeCommentReaction",
  initiativeMention = "initiativeMention",

  // projects
  projectAddedAsMember = "projectAddedAsMember",
  projectAddedAsLead = "projectAddedAsLead",
  projectCommentMention = "projectCommentMention",
  projectNewComment = "projectNewComment",
  projectThreadResolved = "projectThreadResolved",
  projectCommentReaction = "projectCommentReaction",
  projectMention = "projectMention",

  // milestone
  projectMilestoneCommentMention = "projectMilestoneCommentMention",
  projectMilestoneNewComment = "projectMilestoneNewComment",
  projectMilestoneThreadResolved = "projectMilestoneThreadResolved",
  projectMilestoneCommentReaction = "projectMilestoneCommentReaction",
  projectMilestoneMention = "projectMilestoneMention",

  // documents
  documentMention = "documentMention",
  documentCommentMention = "documentCommentMention",
  documentNewComment = "documentNewComment",
  documentThreadResolved = "documentThreadResolved",
  documentCommentReaction = "documentCommentReaction",
  documentReminder = "documentReminder",

  // project updates
  projectUpdateCreated = "projectUpdateCreated",
  projectUpdatePrompt = "projectUpdatePrompt",
  projectUpdateMention = "projectUpdateMentionPrompt",
  projectUpdateReaction = "projectUpdateReaction",

  // project update comments
  projectUpdateNewComment = "projectUpdateNewComment",
  projectUpdateCommentMention = "projectUpdateCommentMention",
  projectUpdateCommentReaction = "projectUpdateCommentReaction",

  // Special control or admin messages that should always be sent, but aren't related to issues
  system = "system",
}

export function getNotificationTitle(notification: NotificationResult): string {
  switch (notification.type as NotificationType) {
    case NotificationType.issueCreated:
      return "New issue";
    case NotificationType.issueMention:
      return "Mentioned in issue";
    case NotificationType.projectUpdateMention:
      return "Mentioned in project update";
    case NotificationType.projectMention:
      return "Mentioned in project";
    case NotificationType.initiativeMention:
      return "Mentioned in initiative";
    case NotificationType.documentMention:
      return "Mentioned in document";
    case NotificationType.projectMilestoneMention:
      return "Mentioned in milestone";
    case NotificationType.issueAddedToTriage:
    case NotificationType.triageResponsibilityIssueAddedToTriage:
      return "New triage issue";
    case NotificationType.issueAddedToView:
      return "Added to view";
    case NotificationType.issueAssignedToYou:
      return "Assigned";
    case NotificationType.issueUnassignedFromYou:
      return "Unassigned";
    case NotificationType.documentNewComment:
    case NotificationType.projectNewComment:
    case NotificationType.initiativeNewComment:
    case NotificationType.issueNewComment:
    case NotificationType.projectUpdateNewComment:
    case NotificationType.projectMilestoneNewComment:
      return "New comment";
    case NotificationType.documentCommentReaction:
    case NotificationType.projectCommentReaction:
    case NotificationType.initiativeCommentReaction:
    case NotificationType.issueCommentReaction:
    case NotificationType.projectUpdateCommentReaction:
    case NotificationType.projectMilestoneCommentReaction:
      return "Reacted to comment";
    case NotificationType.documentCommentMention:
    case NotificationType.projectCommentMention:
    case NotificationType.initiativeCommentMention:
    case NotificationType.issueCommentMention:
    case NotificationType.projectUpdateCommentMention:
    case NotificationType.projectMilestoneCommentMention:
      return "Mentioned in comment";
    case NotificationType.documentThreadResolved:
    case NotificationType.projectThreadResolved:
    case NotificationType.initiativeThreadResolved:
    case NotificationType.issueThreadResolved:
    case NotificationType.projectMilestoneThreadResolved:
      return "Resolved a thread";
    case NotificationType.projectUpdateReaction:
      return "Reacted to project update";
    case NotificationType.issueEmojiReaction:
      return "Reacted to issue";
    case NotificationType.issueReminder:
    case NotificationType.documentReminder:
      return "Reminder";
    case NotificationType.issuePriorityUrgent:
      return "Urgent priority";
    case NotificationType.issueSubscribed:
      return "Subscribed";
    case NotificationType.issueBlocking:
      return "Marked as blocking";
    case NotificationType.issueUnblocked:
      return "No longer blocked";
    case NotificationType.issueMovedToProject:
      return "Issue moved to project";
    case NotificationType.issueStatusChangedDone:
    case NotificationType.issueStatusChangedAll:
      if (notification.issue) {
        return (
          {
            [StateType.completed]: "Marked as completed",
            [StateType.canceled]: "Marked as canceled",
          }[notification.issue.state.type] || "Status updated"
        );
      }
      return "Status updated";
    case NotificationType.issueDue:
      return "Due";
    case NotificationType.oauthClientApprovalCreated:
      return "Application install request";
    case NotificationType.projectAddedAsMember:
      return "Added as member of project";
    case NotificationType.projectAddedAsLead:
      return "Added as lead of project";
    case NotificationType.initiativeAddedAsOwner:
      return "Added as owner of initiative";
    case NotificationType.projectUpdateCreated:
      return "New project update";
    case NotificationType.projectUpdatePrompt:
      return "Project update reminder";
    case NotificationType.issueSlaHighRisk:
      return "High risk of breaching SLA";
    case NotificationType.issueSlaBreached:
      return "SLA breached";
    case NotificationType.system:
      return "Message";
    default:
      return "Unknown notification";
  }
}

export function getNotificationIcon(notification: NotificationResult): Image.ImageLike {
  switch (notification.type as NotificationType) {
    case NotificationType.issueCreated:
      return Icon.Plus;
    case NotificationType.issueMention:
    case NotificationType.projectUpdateMention:
    case NotificationType.projectMention:
    case NotificationType.initiativeMention:
    case NotificationType.documentMention:
    case NotificationType.projectMilestoneMention:
    case NotificationType.documentCommentMention:
    case NotificationType.projectCommentMention:
    case NotificationType.initiativeCommentMention:
    case NotificationType.issueCommentMention:
    case NotificationType.projectUpdateCommentMention:
    case NotificationType.projectMilestoneCommentMention:
      return Icon.AtSymbol;
    case NotificationType.issueAddedToTriage:
    case NotificationType.triageResponsibilityIssueAddedToTriage:
      return {
        source: { light: "light/triage.svg", dark: "dark/triage.svg" },
      };
    case NotificationType.issueStatusChangedDone:
    case NotificationType.issueStatusChangedAll:
      if (notification.issue) {
        return getStatusIcon(notification.issue.state);
      }

      return Icon.Pencil;
    case NotificationType.issueAssignedToYou:
    case NotificationType.projectAddedAsMember:
    case NotificationType.projectAddedAsLead:
    case NotificationType.initiativeAddedAsOwner:
      return Icon.AddPerson;
    case NotificationType.issueUnassignedFromYou:
      return Icon.RemovePerson;
    case NotificationType.documentNewComment:
    case NotificationType.projectNewComment:
    case NotificationType.initiativeNewComment:
    case NotificationType.issueNewComment:
    case NotificationType.projectUpdateNewComment:
    case NotificationType.projectMilestoneNewComment:
      return Icon.Bubble;
    case NotificationType.documentCommentReaction:
    case NotificationType.projectCommentReaction:
    case NotificationType.initiativeCommentReaction:
    case NotificationType.issueCommentReaction:
    case NotificationType.projectUpdateCommentReaction:
    case NotificationType.projectMilestoneCommentReaction:
    case NotificationType.projectUpdateReaction:
    case NotificationType.issueEmojiReaction:
      if (notification.reactionEmoji) {
        return emojis.get(notification.reactionEmoji) ?? Icon.Emoji;
      }

      return Icon.Emoji;
    case NotificationType.documentThreadResolved:
    case NotificationType.projectThreadResolved:
    case NotificationType.initiativeThreadResolved:
    case NotificationType.issueThreadResolved:
    case NotificationType.projectMilestoneThreadResolved:
      return Icon.CheckCircle;
    case NotificationType.issueReminder:
    case NotificationType.documentReminder:
      return Icon.Clock;
    case NotificationType.issuePriorityUrgent:
      return {
        source: { light: "light/priority-urgent.svg", dark: "dark/priority-urgent.svg" },
      };
    case NotificationType.issueSubscribed:
      return Icon.Bell;
    case NotificationType.issueBlocking:
      return Icon.ExclamationMark;
    case NotificationType.issueUnblocked:
      return Icon.Minus;
    case NotificationType.issueMovedToProject:
      return Icon.ArrowRight;
    case NotificationType.issueDue:
      return Icon.Calendar;
    case NotificationType.oauthClientApprovalCreated:
      return Icon.Download;
    case NotificationType.projectUpdateCreated:
    case NotificationType.issueAddedToView:
      return Icon.Plus;
    case NotificationType.projectUpdatePrompt:
      return Icon.Heartbeat;
    case NotificationType.issueSlaHighRisk:
    case NotificationType.issueSlaBreached:
      return Icon.Warning;
    case NotificationType.system:
      return Icon.SpeechBubble;
    default:
      return Icon.Bell;
  }
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
