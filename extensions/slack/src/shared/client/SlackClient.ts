import { popToRoot, showToast, Toast } from "@raycast/api";
import { slackWebClient } from "./WebClient";

interface Item {
  id: string;
  teamId: string;
  name: string;
  icon: string;
}

export interface User extends Item {
  username: string;
}

export type Channel = Item;
export type Group = Item;

export type PresenceStatus = "online" | "offline" | "forced-offline";
export interface SnoozeStatus {
  nextDndEnd: Date | undefined;
  snoozeEnd: Date | undefined;
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

export const onApiError = async (props?: { exitExtension: boolean }): Promise<void> => {
  await showToast({
    style: Toast.Style.Failure,
    title: "Slack API Error",
    message: "Your Slack token might be invalid",
  });

  if (props?.exitExtension) {
    await popToRoot({ clearSearchBar: true });
  }
};

export class SlackClient {
  public static async getUsers(): Promise<User[]> {
    const userList = await slackWebClient.users.list();

    const users =
      userList.members
        ?.filter(
          ({ is_bot, is_workflow_bot, deleted, id }) => !is_bot && !is_workflow_bot && !deleted && id !== "USLACKBOT"
        )
        .map(({ id, name: username, profile, team_id }) => {
          const firstName = profile?.first_name ?? "";
          const lastName = profile?.last_name ?? "";
          const name = `${firstName} ${lastName}`;

          const [displayName] = [name, profile?.display_name, profile?.real_name].filter(
            (x): x is string => !!x?.trim()
          );

          return {
            id,
            name: displayName,
            icon: profile?.image_24,
            teamId: team_id,
            username,
          };
        })
        .filter((i): i is User => (i.id && i.id.trim() && i.name?.trim() && i.teamId?.trim() ? true : false))
        .sort((a, b) => sortNames(a.name, b.name)) ?? [];

    return users ?? [];
  }

  public static async getChannels(): Promise<Channel[]> {
    const publicChannels = await slackWebClient.conversations.list({
      exclude_archived: true,
      types: "public_channel",
      limit: 1000,
    });
    const privateChannels = await slackWebClient.conversations.list({
      exclude_archived: true,
      types: "private_channel",
      limit: 1000,
    });

    const publicAndPrivateChannels = [...(publicChannels.channels ?? []), ...(privateChannels.channels ?? [])];

    const channels: Channel[] =
      publicAndPrivateChannels
        ?.map(({ id, name, shared_team_ids, internal_team_ids, is_private }) => {
          const teamIds = [...(internal_team_ids ?? []), ...(shared_team_ids ?? [])];
          const teamId = teamIds.length > 0 ? teamIds[0] : "";
          return { id, name, teamId, icon: is_private ? "channel-private.png" : "channel-public.png" };
        })
        .filter((i): i is Channel => (i.id?.trim() && i.name?.trim() && i.teamId.trim() ? true : false))
        .sort((a, b) => sortNames(a.name, b.name)) ?? [];

    return channels ?? [];
  }

  public static async getGroups(): Promise<Group[]> {
    const users = await SlackClient.getUsers();

    const conversations = await slackWebClient.conversations.list({
      exclude_archived: true,
      types: "mpim",
      limit: 1000,
    });

    const groups: Group[] =
      conversations.channels
        ?.map(({ id, name, shared_team_ids, internal_team_ids }) => {
          const teamIds = [...(internal_team_ids ?? []), ...(shared_team_ids ?? [])];
          const teamId = teamIds.length > 0 ? teamIds[0] : "";

          const userNames = name?.replace("mpdm-", "").replace("-1", "").split("--") ?? [];
          const displayName = userNames
            .map((username) => users.find((user) => user.username === username)?.name)
            .filter((x) => !!x)
            .join(", ");

          return { id, name: displayName, teamId, icon: "channel-private.png" };
        })
        .filter((i): i is Group => (i.id?.trim() && i.name?.trim() && i.teamId.trim() ? true : false))
        .sort((a, b) => sortNames(a.name, b.name)) ?? [];

    return groups ?? [];
  }

  public static async getPresence(): Promise<PresenceStatus> {
    const presence = await slackWebClient.users.getPresence();

    if (presence.manual_away) {
      return "forced-offline";
    }

    return presence.presence === "away" ? "offline" : "online";
  }

  public static async setPresence(status: "away" | "auto"): Promise<void> {
    await slackWebClient.users.setPresence({ presence: status });
  }

  public static async getSnoozeStatus(): Promise<SnoozeStatus> {
    const dndInfo = await slackWebClient.dnd.info();
    const snooze_endtime = (dndInfo as unknown as { snooze_endtime: number | undefined }).snooze_endtime;

    const nextDndEnd = dndInfo.next_dnd_end_ts ? new Date(dndInfo.next_dnd_end_ts * 1000) : undefined;
    const snoozeEnd = snooze_endtime ? new Date(snooze_endtime * 1000) : undefined;
    return { nextDndEnd, snoozeEnd };
  }

  public static async setSnooze(minutes: number): Promise<void> {
    await slackWebClient.dnd.setSnooze({ num_minutes: minutes });
  }

  public static async endSnooze(): Promise<void> {
    await slackWebClient.dnd.endSnooze();
  }
}
