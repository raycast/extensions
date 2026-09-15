import type { Image } from "@raycast/api";
import type { SlackConversation } from "./slackTypes";

interface ConversationItem {
  id: string;
  teamId: string;
  name: string;
  icon: Image.ImageLike;
}

export type Channel = ConversationItem;

export type Group = ConversationItem & {
  groupName: string;
};

function getConversationTeamId(conversation: SlackConversation): string {
  return conversation.internal_team_ids?.[0] ?? conversation.shared_team_ids?.[0] ?? conversation.context_team_id ?? "";
}

export function toChannel(conversation: SlackConversation): Channel | undefined {
  const teamId = getConversationTeamId(conversation);
  if (!conversation.id || !conversation.name || !teamId) return undefined;

  return {
    id: conversation.id,
    name: conversation.name,
    teamId,
    icon: conversation.is_private ? "channel-private.png" : "channel-public.png",
  };
}

export function toGroup(conversation: SlackConversation, userNames: ReadonlyMap<string, string>): Group | undefined {
  const teamId = getConversationTeamId(conversation);
  if (!conversation.id || !conversation.name || !teamId) return undefined;

  const usernames = conversation.name
    .replace(/^mpdm-/, "")
    .replace(/-1$/, "")
    .split("--");
  const displayName = usernames.map((username) => userNames.get(username) ?? username).join(", ");
  if (!displayName) return undefined;

  return {
    id: conversation.id,
    name: displayName,
    teamId,
    icon: "channel-private.png",
    groupName: conversation.name,
  };
}
