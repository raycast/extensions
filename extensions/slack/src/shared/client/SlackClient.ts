import { Icon, Image } from "@raycast/api";
import { SlackConversation, SlackMember, getSlackWebClient } from "./WebClient";
import { formatRelative } from "date-fns";

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

export type Channel = Item;
export type Group = Item & {
  groupName: string;
};

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

export class SlackClient {
  public static async getUsers(): Promise<User[]> {
    const [slackMembers, dmConversations] = await Promise.all([
      SlackClient.getSlackMembers(),
      SlackClient.getConversations(["im"]),
    ]);

    const users =
      slackMembers
        .filter(
          ({ is_bot, is_workflow_bot, deleted, id }) => !is_bot && !is_workflow_bot && !deleted && id !== "USLACKBOT",
        )
        .map(({ id, name: username, profile, team_id, tz }) => {
          const firstName = profile?.first_name ?? "";
          const lastName = profile?.last_name ?? "";
          const name = `${firstName} ${lastName}`;
          const jobTitle = profile?.title ?? "";
          const statusEmoji = profile?.status_emoji ?? undefined;
          const statusText = profile?.status_text?.replace(/&amp;/g, "&") ?? undefined;
          const statusExpiration = profile?.status_expiration ?? undefined;
          const timezone = tz ?? "";

          let statusExpirationDate = "";

          if (statusExpiration) {
            const date = new Date(statusExpiration * 1000);
            if (!isNaN(date.getTime())) {
              statusExpirationDate = formatRelative(date, new Date(), { weekStartsOn: 1 });
              statusExpirationDate = `Until ${statusExpirationDate}`;
            }
          }

          const displayName = [name, profile?.display_name, profile?.real_name].find((x): x is string => !!x?.trim());

          const conversation = dmConversations.find((c) => c.user === id);

          return {
            id,
            name: displayName,
            icon: profile?.image_24 ? { source: profile?.image_24, mask: Image.Mask.Circle } : Icon.Person,
            teamId: team_id,
            username,
            title: jobTitle,
            statusEmoji,
            statusText,
            statusExpiration: statusExpirationDate,
            conversationId: conversation?.id,
            timezone,
          } as User;
        })
        .filter((i) => !!(i.id?.trim() && i.name?.trim() && i.teamId?.trim()))
        .sort((a, b) => sortNames(a.name, b.name)) ?? [];

    return users;
  }

  private static async getSlackMembers(): Promise<SlackMember[]> {
    const slackWebClient = getSlackWebClient();
    const slackMembers: SlackMember[] = [];

    let cursor: string | undefined;
    do {
      const response = await slackWebClient.users.list({
        limit: 1000,
        cursor,
      });
      slackMembers.push(...(response.members ?? []));
      cursor = response.response_metadata?.next_cursor;
    } while (cursor);

    return slackMembers;
  }

  private static async getConversations(
    type: ("public_channel" | "private_channel" | "mpim" | "im")[],
  ): Promise<SlackConversation[]> {
    const slackWebClient = getSlackWebClient();

    const conversations: SlackConversation[] = [];

    let cursor: string | undefined;
    do {
      const response = await slackWebClient.conversations.list({
        exclude_archived: true,
        types: type.join(","),
        limit: 1000,
        cursor,
      });
      conversations.push(...(response.channels ?? []));
      cursor = response.response_metadata?.next_cursor;
    } while (cursor);

    return conversations;
  }

  public static async getChannels(): Promise<Channel[]> {
    const channels = await SlackClient.getConversations(["public_channel", "private_channel"]);

    return (
      channels
        .map(({ id, name, shared_team_ids, internal_team_ids, context_team_id, is_private }) => {
          const teamIds = [
            ...(internal_team_ids ?? []),
            ...(shared_team_ids ?? []),
            ...(context_team_id ? [context_team_id] : []),
          ];
          const teamId = teamIds.length > 0 ? teamIds[0] : "";
          return { id, name, teamId, icon: is_private ? "channel-private.png" : "channel-public.png" } as Channel;
        })
        .filter((i) => !!(i.id?.trim() && i.name?.trim() && i.teamId.trim()))
        .sort((a, b) => sortNames(a.name, b.name)) ?? []
    );
  }

  public static async getGroups(): Promise<Group[]> {
    const users = await SlackClient.getUsers();

    const conversations = await SlackClient.getConversations(["mpim"]);

    const groups: Group[] =
      conversations
        .map(({ id, name, shared_team_ids, internal_team_ids }) => {
          const teamIds = [...(internal_team_ids ?? []), ...(shared_team_ids ?? [])];
          const teamId = teamIds.length > 0 ? teamIds[0] : "";

          const userNames = name?.replace("mpdm-", "").replace("-1", "").split("--") ?? [];
          const displayName = userNames
            .map((username) => users.find((user) => user.username === username)?.name)
            .filter((x) => !!x)
            .join(", ");

          return { id, name: displayName, teamId, icon: "channel-private.png", groupName: name } as Group;
        })
        .filter((i) => !!(i.id?.trim() && i.name?.trim() && i.teamId.trim()))
        .sort((a, b) => sortNames(a.name, b.name)) ?? [];

    return groups;
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
}
