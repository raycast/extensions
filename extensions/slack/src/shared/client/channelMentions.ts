import { getConversationTeamId } from "./conversation";
import type { CursorPage } from "./pagination";
import { collectPaginatedResults, matchesAllWords } from "./pagination";
import type { SlackConversation } from "./slackTypes";

const MAX_MENTIONS = 50;
const MAX_DESCRIPTION_LENGTH = 120;

type MentionChannel = {
  id: string;
  teamId: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  description: string;
};

type LoadConversationsPage = (cursor?: string) => Promise<CursorPage<SlackConversation>>;

type ChannelMentionSources = {
  /** Channels the signed-in user belongs to, used for the default list. */
  loadMemberChannelsPage: LoadConversationsPage;
  /** Every channel visible to the signed-in user, used when they type a query. */
  loadChannelsPage: LoadConversationsPage;
};

function compactText(value: string | undefined): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text.length > MAX_DESCRIPTION_LENGTH ? `${text.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…` : text;
}

function toMentionChannel(conversation: SlackConversation): MentionChannel | undefined {
  const teamId = getConversationTeamId(conversation);
  if (!conversation.id || !conversation.name || !teamId) return undefined;
  if (conversation.is_im || conversation.is_mpim || conversation.name.startsWith("mpdm-")) return undefined;
  if (conversation.is_archived) return undefined;

  return {
    id: conversation.id,
    teamId,
    name: conversation.name,
    isPrivate: conversation.is_private === true,
    isMember: conversation.is_member === true,
    description: compactText(conversation.topic?.value) || compactText(conversation.purpose?.value),
  };
}

function compareChannels(a: MentionChannel, b: MentionChannel): number {
  if (a.isMember !== b.isMember) return a.isMember ? -1 : 1;
  return a.name.localeCompare(b.name);
}

export function toChannelMentions(channels: readonly MentionChannel[]) {
  return channels.slice(0, MAX_MENTIONS).map((channel) => ({
    title: `#${channel.name}`,
    uri: `slack://channels/${channel.teamId}/${channel.id}`,
    ...(channel.description && { description: channel.description }),
    icon: channel.isPrivate ? "channel-private.png" : "channel-public.png",
  }));
}

/**
 * An empty query lists the channels the user belongs to, which is a far better default than the first page of an
 * alphabetical workspace directory. A query scans every visible channel and ranks the user's own channels first.
 */
export async function searchChannelMentions(query: string, sources: ChannelMentionSources, signal?: AbortSignal) {
  const normalizedQuery = query.trim().replace(/^#/, "");

  if (!normalizedQuery) {
    const channels = await collectPaginatedResults({
      loadPage: sources.loadMemberChannelsPage,
      transform: (conversation: SlackConversation) => {
        const channel = toMentionChannel(conversation);
        // users.conversations only returns joined channels but does not always set is_member.
        return channel && { ...channel, isMember: true };
      },
      matches: () => true,
      maxResults: Number.POSITIVE_INFINITY,
      scanAllPages: true,
      signal,
    });
    return toChannelMentions(channels.sort(compareChannels));
  }

  const channels = await collectPaginatedResults({
    loadPage: sources.loadChannelsPage,
    transform: toMentionChannel,
    matches: (channel) => matchesAllWords([channel.name], normalizedQuery),
    maxResults: MAX_MENTIONS,
    scanAllPages: true,
    prioritize: (channel) => channel.isMember,
    signal,
  });
  return toChannelMentions(channels.sort(compareChannels));
}

type GetChannel = (id: string) => Promise<{ ok?: boolean; error?: string; channel?: SlackConversation }>;

export async function readChannelMention(uri: string, getChannel: GetChannel) {
  const match = /^slack:\/\/channels\/(T[A-Z0-9]{8,})\/([CG][A-Z0-9]{8,})$/.exec(uri);
  if (!match) throw new Error("Invalid Slack channel URI.");
  const [, teamId, channelId] = match;
  const response = await getChannel(channelId);
  if (response.error || response.ok === false) {
    throw new Error(response.error ?? "Could not read the Slack channel.");
  }

  const channel = response.channel;
  if (!channel || channel.id !== channelId || !channel.name || channel.is_im || channel.is_mpim) {
    throw new Error("This Slack channel is no longer available.");
  }
  const channelTeamIds = [
    ...(channel.internal_team_ids ?? []),
    ...(channel.shared_team_ids ?? []),
    ...(channel.context_team_id ? [channel.context_team_id] : []),
  ];
  if (!channelTeamIds.includes(teamId)) throw new Error("This Slack channel belongs to a different workspace.");

  return {
    text: JSON.stringify(
      {
        id: channel.id,
        teamId,
        name: channel.name,
        isPrivate: channel.is_private === true,
        isArchived: channel.is_archived === true,
        topic: channel.topic?.value || undefined,
        purpose: channel.purpose?.value || undefined,
        memberCount: channel.num_members,
        mention: `<#${channel.id}>`,
        url: `slack://channel?team=${teamId}&id=${channelId}`,
      },
      null,
      2,
    ),
    mimeType: "application/json",
  };
}
