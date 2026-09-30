import { Icon, Image } from "@raycast/api";
import * as emojis from "node-emoji";

import { NotificationResult } from "../api/getNotifications";

import { getStatusIcon } from "./states";

export function getNotificationIcon(notification: NotificationResult): Image.ImageLike {
  const type = notification.type;

  // Handle reactions with actual emoji
  if (notification.reactionEmoji && type.includes("Reaction")) {
    return emojis.get(notification.reactionEmoji) ?? Icon.Emoji;
  }

  // Handle issue state changes with state-specific icons
  if ((type === "issueStatusChanged" || type === "issueStatusChangedAll") && notification.issue) {
    return getStatusIcon(notification.issue.state);
  }

  // Map notification types to icons using type name patterns
  if (type.includes("Mention")) return Icon.AtSymbol;
  if (type.includes("Comment") && !type.includes("Reaction")) return Icon.Bubble;
  if (type.includes("ThreadResolved")) return Icon.CheckCircle;
  if (type.includes("Reminder")) return Icon.Clock;
  if (type.includes("Assigned")) return Icon.AddPerson;
  if (type.includes("Unassigned")) return Icon.RemovePerson;
  if (type.includes("Created") || type.includes("AddedToView")) return Icon.Plus;
  if (type.includes("Sla")) return Icon.Warning;

  // Specific type mappings
  const iconMap: Record<string, Image.ImageLike> = {
    issueAddedToTriage: { source: { light: "light/triage.svg", dark: "dark/triage.svg" } },
    triageResponsibilityIssueAddedToTriage: { source: { light: "light/triage.svg", dark: "dark/triage.svg" } },
    issuePriorityUrgent: { source: { light: "light/priority-urgent.svg", dark: "dark/priority-urgent.svg" } },
    issueBlocking: Icon.ExclamationMark,
    issueUnblocked: Icon.Minus,
    issueMovedToProject: Icon.ArrowRight,
    issueDue: Icon.Calendar,
    issueSubscribed: Icon.Bell,
    oauthClientApprovalCreated: Icon.Download,
    projectUpdatePrompt: Icon.Heartbeat,
    system: Icon.SpeechBubble,
  };

  return iconMap[type] ?? Icon.Bell;
}

export function getNotificationMenuBarTitle(unreadNotifications: NotificationResult[]) {
  return unreadNotifications.length !== 0 ? String(unreadNotifications.length) : undefined;
}

export function getNotificationURL(notification: NotificationResult) {
  // Use the URL provided by the Linear API first, which is more reliable
  if (notification.url) return notification.url;

  // Fallback to legacy logic for backwards compatibility
  if (notification.comment?.url) return notification.comment.url;
  if (notification.projectUpdate?.url) return notification.projectUpdate.url;
  if (notification.project?.url) return notification.project.url;
  if (notification.issue?.url) return notification.issue.url;
}
