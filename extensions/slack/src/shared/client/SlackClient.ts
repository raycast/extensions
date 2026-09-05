import { Icon, Image } from "@raycast/api";
import { getSlackWebClient } from "./WebClient";
import type { SlackMember } from "./slackTypes";
import { formatRelative } from "date-fns";
import { Profile } from "@slack/web-api/dist/types/response/UsersProfileGetResponse";
import { collectPaginatedResults, matchesAllWords, matchesVisibleName } from "./pagination";
import { getDirectorySearchPageSize } from "./directory";
import { searchConversationDirectory, searchUserNames } from "./conversationSearch";
import { toChannel, toGroup } from "./conversation";
import type { Channel, Group } from "./conversation";
import { toUserName } from "./member";

export type { Channel, Group } from "./conversation";

interface Item {
  id: string;
  teamId: string;
  name: string;
  icon: Image.ImageLike;
}

export interface User extends Item {
  username: string;
  conversationId: string | undefined;
  title: string;
  statusEmoji: string | undefined;
  statusText: string | undefined;
  statusExpiration: string;
  timezone: string;
  icon: string | { source: string; mask: Image.Mask };
}

export type PresenceStatus = "online" | "offline" | "forced-offline";
export interface SnoozeStatus {
  nextDndEnd: Date | undefined;
  snoozeEnd: Date | undefined;
}

export interface Message {
  receivedAt: Date;
  message: string;
  senderId: string;
}
export interface UnreadChannelInfo {
  conversationId: string;
  messageHistory: Message[];
}

const sortNames = (a: string, b: string) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

const pageSize = 200;
const maxSearchResultsPerType = 100;

function toUser(member: SlackMember): User | undefined {
  const { id, name: username, profile, team_id: teamId, tz } = member;
  const userName = toUserName(member);

  if (!id || !userName || !teamId) return undefined;
  const [, displayName] = userName;

  let statusExpiration = "";
  if (profile?.status_expiration) {
    const date = new Date(profile.status_expiration * 1000);
    if (!isNaN(date.getTime())) {
      statusExpiration = `Until ${formatRelative(date, new Date(), { weekStartsOn: 1 })}`;
    }
  }

  return {
    id,
    name: displayName,
    icon: profile?.image_24 ? { source: profile.image_24, mask: Image.Mask.Circle } : Icon.Person,
    teamId,
    username: username ?? "",
    title: profile?.title ?? "",
    statusEmoji: profile?.status_emoji || undefined,
    statusText: profile?.status_text?.replace(/&amp;/g, "&") || undefined,
    statusExpiration,
    conversationId: undefined,
    timezone: tz ?? "",
  };
}

export class SlackClient {
  public static async getUsers(): Promise<User[]> {
    const slackWebClient = getSlackWebClient();
    const users = await collectPaginatedResults({
      loadPage: async (cursor) => {
        const response = await slackWebClient.users.list({ limit: pageSize, cursor });
        return { items: response.members ?? [], nextCursor: response.response_metadata?.next_cursor };
      },
      transform: toUser,
      matches: () => true,
      maxResults: Number.POSITIVE_INFINITY,
      scanAllPages: true,
    });

    const usersById = new Map(users.map((user) => [user.id, user]));
    let cursor: string | undefined;
    do {
      const response = await slackWebClient.conversations.list({
        exclude_archived: true,
        types: "im",
        limit: pageSize,
        cursor,
      });
      for (const conversation of response.channels ?? []) {
        const user = conversation.user ? usersById.get(conversation.user) : undefined;
        if (user) user.conversationId = conversation.id;
      }
      cursor = response.response_metadata?.next_cursor || undefined;
    } while (cursor);

    return users.sort((a, b) => sortNames(a.name, b.name));
  }

  public static async getChannels(): Promise<Channel[]> {
    const slackWebClient = getSlackWebClient();
    const channels = await collectPaginatedResults({
      loadPage: async (cursor) => {
        const response = await slackWebClient.conversations.list({
          exclude_archived: true,
          types: "public_channel,private_channel",
          limit: pageSize,
          cursor,
        });
        return { items: response.channels ?? [], nextCursor: response.response_metadata?.next_cursor };
      },
      transform: toChannel,
      matches: () => true,
      maxResults: Number.POSITIVE_INFINITY,
      scanAllPages: true,
    });

    return channels.sort((a, b) => sortNames(a.name, b.name));
  }

  public static async getGroups(users: User[]): Promise<Group[]> {
    const slackWebClient = getSlackWebClient();
    const userNames = new Map(users.map((user) => [user.username, user.name]));
    const groups = await collectPaginatedResults({
      loadPage: async (cursor) => {
        const response = await slackWebClient.conversations.list({
          exclude_archived: true,
          types: "mpim",
          limit: pageSize,
          cursor,
        });
        return { items: response.channels ?? [], nextCursor: response.response_metadata?.next_cursor };
      },
      transform: (conversation) => toGroup(conversation, userNames),
      matches: () => true,
      maxResults: Number.POSITIVE_INFINITY,
      scanAllPages: true,
    });

    return groups.sort((a, b) => sortNames(a.name, b.name));
  }

  public static async searchUsers(query: string, signal?: AbortSignal): Promise<User[]> {
    const slackWebClient = getSlackWebClient();
    const scanAllPages = query.trim().length > 0;

    const userMatches = await collectPaginatedResults({
      loadPage: async (cursor) => {
        const response = await slackWebClient.users.list({
          limit: getDirectorySearchPageSize(query),
          cursor,
        });
        return { items: response.members ?? [], nextCursor: response.response_metadata?.next_cursor };
      },
      transform: (member) => {
        const user = toUser(member);
        if (!user) return undefined;

        return {
          user,
          searchableValues: [
            member.name,
            member.real_name,
            member.profile?.display_name,
            member.profile?.real_name,
            member.profile?.email,
            member.profile?.title,
          ],
        };
      },
      matches: ({ searchableValues }) => matchesAllWords(searchableValues, query),
      maxResults: maxSearchResultsPerType,
      scanAllPages,
      signal,
      stopAfterPage: (pageResults) =>
        scanAllPages && pageResults.some(({ user }) => matchesVisibleName(user.name, query)),
    });

    return userMatches.map(({ user }) => user).sort((a, b) => sortNames(a.name, b.name));
  }

  public static async searchConversations(query: string, signal?: AbortSignal): Promise<[Channel[], Group[]]> {
    const slackWebClient = getSlackWebClient();
    const userNames = await searchUserNames({
      query,
      maxResults: maxSearchResultsPerType,
      loadPage: async (cursor) => {
        const response = await slackWebClient.users.list({
          limit: getDirectorySearchPageSize(query),
          cursor,
        });
        return { items: response.members ?? [], nextCursor: response.response_metadata?.next_cursor };
      },
      signal,
    });
    signal?.throwIfAborted();

    const [channels, groups] = await searchConversationDirectory({
      query,
      maxResultsPerType: maxSearchResultsPerType,
      userNames,
      loadConversationsPage: async (cursor) => {
        const response = await slackWebClient.conversations.list({
          exclude_archived: true,
          types: "public_channel,private_channel,mpim",
          limit: getDirectorySearchPageSize(query),
          cursor,
        });
        return { items: response.channels ?? [], nextCursor: response.response_metadata?.next_cursor };
      },
      signal,
    });

    return [channels.sort((a, b) => sortNames(a.name, b.name)), groups.sort((a, b) => sortNames(a.name, b.name))];
  }

  public static async getPresence(): Promise<PresenceStatus> {
    const slackWebClient = getSlackWebClient();

    const presence = await slackWebClient.users.getPresence({});

    if (presence.manual_away) {
      return "forced-offline";
    }

    return presence.presence === "away" ? "offline" : "online";
  }

  public static async setPresence(status: "away" | "auto"): Promise<void> {
    const slackWebClient = getSlackWebClient();

    await slackWebClient.users.setPresence({ presence: status });
  }

  public static async getSnoozeStatus(): Promise<SnoozeStatus> {
    const slackWebClient = getSlackWebClient();

    const dndInfo = await slackWebClient.dnd.info({});
    const snooze_endtime = (dndInfo as unknown as { snooze_endtime: number | undefined }).snooze_endtime;

    const nextDndEnd = dndInfo.next_dnd_end_ts ? new Date(dndInfo.next_dnd_end_ts * 1000) : undefined;
    const snoozeEnd = snooze_endtime ? new Date(snooze_endtime * 1000) : undefined;
    return { nextDndEnd, snoozeEnd };
  }

  public static async setSnooze(minutes: number): Promise<void> {
    const slackWebClient = getSlackWebClient();

    await slackWebClient.dnd.setSnooze({ num_minutes: minutes });
  }

  public static async endSnooze(): Promise<void> {
    const slackWebClient = getSlackWebClient();

    await slackWebClient.dnd.endSnooze({});
  }

  public static async getUnreadConversations(conversationIds: string[]): Promise<UnreadChannelInfo[]> {
    const slackWebClient = getSlackWebClient();

    if (conversationIds.length > 30) {
      throw new Error("Too many conversations");
    }

    if (conversationIds.length === 0) {
      return [];
    }

    const conversationInfos = await Promise.all(
      conversationIds.map((id) => slackWebClient.conversations.info({ channel: id })),
    );

    const conversationHistories = await Promise.all(
      conversationInfos.map((conversationInfo) =>
        slackWebClient.conversations.history({
          channel: conversationInfo.channel!.id!,
          oldest:
            parseFloat(conversationInfo.channel!.last_read || "0") !== 0
              ? conversationInfo.channel!.last_read
              : undefined,
        }),
      ),
    );

    const unreadConversations = conversationHistories
      .map(({ messages }, index) => ({
        conversationId: conversationInfos[index].channel!.id!,
        messageHistory: messages
          ?.map((message) => ({
            receivedAt: message.ts ? new Date(parseFloat(message.ts) * 1000) : undefined,
            message:
              message.text && message.text !== "This content can't be displayed."
                ? message.text
                : message.blocks?.map((block) => block.text?.text).join("\n\n\n\n\n\n\n\n"),
            senderId: message.user ?? message.bot_id,
          }))
          .filter((x): x is Message => !!x.receivedAt && !!x.message && !!x.senderId),
      }))
      .filter((channel): channel is UnreadChannelInfo => !!channel.messageHistory && channel.messageHistory.length > 0)
      .sort(
        (a, b) =>
          new Date(b.messageHistory[0].receivedAt).getTime() - new Date(a.messageHistory[0].receivedAt).getTime(),
      );

    return unreadConversations;
  }

  public static async markAsRead(conversationId: string): Promise<void> {
    const slackWebClient = getSlackWebClient();

    await slackWebClient.conversations.mark({ channel: conversationId, ts: `${new Date().getTime() / 1000}` });
  }

  public static async getMe() {
    const slackWebClient = getSlackWebClient();

    const authResponse = await slackWebClient.auth.test();

    const id = authResponse.user_id;
    const username = authResponse.user;
    return { id, username };
  }

  public static async getUserProfileById(userId: string): Promise<Profile> {
    const slackWebClient = getSlackWebClient();
    const result = await slackWebClient.users.profile.get({
      user: userId,
    });

    if (!result.profile) {
      throw new Error(`${userId} does not have a profile.`);
    }

    return result.profile;
  }

  public static async getWorkspaceEmojis() {
    const slackWebClient = getSlackWebClient();
    const { emoji: rawEmojis } = await slackWebClient.emoji.list();

    if (!rawEmojis) {
      return {};
    }

    const resolveAlias = (name: string, visited = new Set()): string | null => {
      if (visited.has(name)) return null;

      const value = rawEmojis[name];
      if (!value) return null;

      return value.startsWith("alias:")
        ? resolveAlias(value.replace("alias:", ""), new Set([...visited, name]))
        : value;
    };

    return Object.fromEntries(
      Object.keys(rawEmojis)
        .map((key) => [key, resolveAlias(key)] as const)
        .filter((entry): entry is readonly [string, string] => typeof entry[1] === "string")
        .map(([key, value]) => [`:${key}:`, value] as const),
    );
  }

  public static async setStatus({
    statusText,
    emoji,
    expiration,
    originProfile,
  }: {
    statusText?: string;
    emoji?: string;
    expiration?: number;
    originProfile?: Profile;
  }) {
    const slackWebClient = getSlackWebClient();

    const profile = {
      status_text: originProfile?.status_text,
      status_emoji: originProfile?.status_emoji,
      status_expiration: originProfile?.status_expiration,
    };

    if (statusText !== undefined) {
      profile.status_text = statusText;
    }

    if (emoji !== undefined) {
      profile.status_emoji = emoji;
    }

    if (expiration !== undefined) {
      profile.status_expiration = expiration;
    }

    const result = await slackWebClient.users.profile.set({
      profile: profile,
    });

    return result.profile;
  }
}
