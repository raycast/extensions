import { Icon, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { LinearUser } from "./types";
import { match } from "ts-pattern";

export function getLinearUserAccessory(user?: LinearUser): List.Item.Accessory {
  if (user) {
    return {
      icon: user.avatar_url ? { source: user.avatar_url, mask: Image.Mask.Circle } : getAvatarIcon(user.name),
      tooltip: user.name,
    };
  }
  return { icon: Icon.Person, tooltip: "Unknown" };
}

export function getLinearNotificationReasonAccessory(notification_type: string): List.Item.Accessory {
  const reason = match(notification_type)
    .with("issueAddedToTriage", () => "Added To Triage")
    .with("issueAddedToView", () => "Added To View")
    .with("issueAssignedToYou", () => "Assigned To You")
    .with("issueBlocking", () => "Blocked")
    .with("issueCommentMention", () => "Comment Mention")
    .with("issueCommentReaction", () => "Comment Reaction")
    .with("issueCreated", () => "Created")
    .with("issueDue", () => "Due")
    .with("issueEmojiReaction", () => "Reaction")
    .with("issueMention", () => "Mention")
    .with("issueNewComment", () => "New Comment")
    .with("issueStatusChanged", () => "Status Changed")
    .with("issueUnassignedFromYou", () => "Unassigned From You")
    .with("projectAddedAsLead", () => "Added As Lead")
    .with("projectAddedAsMember", () => "Added As Member")
    .with("projectUpdateCreated", () => "Update Created")
    .with("projectUpdateMentionPrompt", () => "Update Mention")
    .otherwise(() => notification_type);
  return { tag: { value: reason } };
}
