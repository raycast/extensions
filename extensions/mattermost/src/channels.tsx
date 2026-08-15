import {
  Action,
  ActionPanel,
  Icon,
  Image,
  Toast,
  List,
  closeMainWindow,
  getPreferenceValues,
  open,
  showToast,
  LocalStorage,
  openExtensionPreferences,
} from "@raycast/api";
import { getAvatarIcon, runAppleScript, showFailureToast, usePromise } from "@raycast/utils";
import { JSX, useState } from "react";
import { DateTime } from "luxon";
import { MattermostClient } from "./shared/MattermostClient";
import { Channel, UserProfile } from "./shared/MattermostTypes";
import { withAuthorization } from "./shared/withAuthorization";

async function getCachedState(): Promise<State | undefined> {
  return LocalStorage.getItem<string>("channels-state").then((cachedStateJson) =>
    cachedStateJson ? (JSON.parse(cachedStateJson) as State) : undefined,
  );
}

async function setCachedState(state: State): Promise<void> {
  return LocalStorage.setItem("channels-state", JSON.stringify(state));
}

interface State {
  profile: UserProfile;
  teams: TeamUI[];
}

interface TeamUI {
  id: string;
  name: string;
  categories?: ChannelCategoryUI[];
}
interface ChannelCategoryUI {
  name: string;
  channels: ChannelUI[];
}

interface ChannelUI {
  id: string;
  title: string;
  subtitle?: string;
  keywords: string[];
  mentionName: string;
  lastTime?: string;
  statusIcon?: Image.ImageLike;
  icon: Image.ImageLike;
  path: string;
}

/////////////////////////////////////////
/////////////// Command /////////////////
/////////////////////////////////////////

export default function Command() {
  return withAuthorization(<ChannelsFinderList />);
}

function ChannelsFinderList(): JSX.Element {
  const [state, setState] = useState<State | undefined>();
  const preference = getPreferenceValues<Preferences>();

  const { isLoading } = usePromise(async () => {
    if (preference.deepLinkType === "application") {
      try {
        await runAppleScript('launch application "Mattermost"');
      } catch {
        await showFailureToast("Is Mattermost installed?", { title: "Error launching Mattermost" });
      }
    }
    const cachedState = await getCachedState();
    if (cachedState) setState(cachedState);

    const toast = await showToast(Toast.Style.Animated, "Fetch teams...");

    const [profile, teams] = await Promise.all([MattermostClient.getMe(), MattermostClient.getTeams()]);
    const teamsUI: TeamUI[] = teams.map((team) => ({ id: team.id, name: team.name }));

    toast.style = Toast.Style.Success;
    toast.title = `Found ${teamsUI.length} teams`;
    setCachedState({ profile: profile, teams: teamsUI });
    setState({ profile: profile, teams: teamsUI });
  });

  if (!isLoading && state?.teams.length == 1) {
    return <ChannelList team={state?.teams[0]} profile={state?.profile} />;
  }

  if (state !== undefined && state.teams.length > 1) {
    const availableTeamsNames = "Available teams: " + state.teams.map((team) => team.name).join(", ");

    if (preference.teamName !== undefined && preference.teamName !== "") {
      const matchedTeam = state.teams.find((team) => team.name.toLowerCase() == preference.teamName?.toLowerCase());
      if (matchedTeam !== undefined) {
        console.log("Open matchedTeam");
        return <ChannelList team={matchedTeam} profile={state.profile} />;
      } else {
        return (
          <List>
            <List.EmptyView
              title={`Team with name ${preference.teamName} not found.`}
              icon="🤷‍♂️"
              description={availableTeamsNames}
              actions={
                <ActionPanel>
                  <Action title="Open Extension Settings" onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          </List>
        );
      }
    } else {
      return (
        <List>
          <List.EmptyView
            icon="👀"
            title={`Please, specify team name in extension settings`}
            description={`You are on multiple teams. ${availableTeamsNames}`}
            actions={
              <ActionPanel>
                <Action title="Open Extension Settings" onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List>
      );
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search team">
      {state?.teams.length === 0 && <List.EmptyView title="You are not on any team" icon={Icon.Bubble} />}
    </List>
  );
}

function ChannelList(props: { profile: UserProfile; team: TeamUI }) {
  const [team, setTeam] = useState<TeamUI>(props.team);
  const preference = getPreferenceValues<Preferences>();

  async function loadCategories(): Promise<ChannelCategoryUI[]> {
    showToast(Toast.Style.Animated, `Fetch ${team.name} channels...`);

    const [categories, channels] = await Promise.all([
      MattermostClient.getChannelCategories(team.id),
      MattermostClient.getMyChannels(team.id),
    ]);

    const channelsUIMap = new Map<string, ChannelUI>();

    const directChats = channels.filter((channel) => channel.type == "D");
    const directChatsMap = new Map<string, Channel>();
    directChats.forEach((chat) => {
      const profileId = chat.name.split("__").find((member_id) => member_id !== props.profile.id) || props.profile.id;

      directChatsMap.set(profileId, chat);
    });

    const directChatProfiles = directChatsMap.size
      ? await MattermostClient.getProfilesByIds(Array.from(directChatsMap.keys()))
      : [];
    directChatProfiles.forEach((profile) => {
      const chat = directChatsMap.get(profile.id);
      if (chat == undefined) {
        return;
      }

      if (!chat.name.includes(profile.id)) {
        console.error("mismatch between " + profile.id + " and " + chat.name);
      }
      const fullName = profile.first_name + " " + profile.last_name;

      channelsUIMap.set(chat.id, {
        id: chat.id,
        title: fullName.trim().length != 0 ? fullName : profile.username,
        subtitle: "@" + profile.username,
        mentionName: "@" + profile.username,
        keywords: [
          profile.first_name,
          profile.last_name,
          profile.username,
          profile.email,
          profile.nickname,
          profile.position,
          chat.header,
        ].concat(profile.username.split(".")), // for format: last.first_name
        icon: getAvatarIcon(fullName),
        path: "/messages/@" + profile.username,
      });
    });

    const groupChannels = channels.filter((channel) => channel.type !== "D");
    groupChannels.forEach((channel) => {
      channelsUIMap.set(channel.id, {
        id: channel.id,
        title: channel.display_name,
        mentionName: "@" + channel.name,
        keywords: [channel.display_name, channel.name, channel.header, channel.purpose],
        icon: channel.type == "O" ? Icon.Globe : Icon.Lock,
        path: "/channels/" + channel.name,
      });
    });

    const categoriesUI = categories.categories.map((category) => {
      const channelsUI = category.channel_ids
        .map((channel_id) => channelsUIMap.get(channel_id))
        .filter((item): item is ChannelUI => !!item);

      return {
        name: category.display_name,
        channels: channelsUI,
      };
    });

    const cachedState = await getCachedState();
    if (cachedState !== undefined) {
      const teamIndex = cachedState.teams.findIndex((cachedTeam) => cachedTeam.id == team.id);
      cachedState.teams[teamIndex].categories = categoriesUI;
      setCachedState(cachedState);
    }

    const profilesStatuses = directChatsMap.size
      ? await MattermostClient.getProfilesStatus(Array.from(directChatsMap.keys()))
      : [];
    profilesStatuses.forEach((status) => {
      const channel = directChatsMap.get(status.user_id)!;
      const channelUI = channelsUIMap.get(channel.id)!;

      if (status.status !== "online") {
        const lastTime = DateTime.fromMillis(status.last_activity_at);
        channelUI.lastTime = lastTime.toRelative({ base: DateTime.local() })!;
      }

      channelUI.statusIcon = (() => {
        switch (status.status) {
          case "offline":
            return "🔘";
          case "online":
            return "mattermost-online.png";
          case "away":
            return "🏃";
          case "dnd":
            return "⛔️";
        }
      })();
    });

    showToast(Toast.Style.Success, `${team.name} channels`);

    return categoriesUI;
  }

  const { isLoading } = usePromise(async () => {
    team.categories = await loadCategories();
    setTeam(team);
  });

  function generateBaseDeeplink() {
    switch (preference.deepLinkType) {
      case "browser":
        return preference.baseUrl;
      case "application":
        return preference.baseUrl.replace("https://", "mattermost://");
    }
  }

  async function openChannel(channel: ChannelUI) {
    console.log("select channel", channel);
    const baseDeeplink = generateBaseDeeplink();
    const fullDeeplink = baseDeeplink + "/" + team.name + channel.path;
    console.log("open deeplink", fullDeeplink);
    try {
      await open(fullDeeplink);
      await closeMainWindow();
    } catch {
      await showFailureToast("Is Mattermost Running?", { title: "Error opening in Mattermost" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search channel or user">
      {!isLoading && !team.categories?.length && <List.EmptyView title="No channels were found" icon={Icon.Bubble} />}
      {team.categories?.map((category) => {
        return (
          <List.Section key={category.name} title={category.name} subtitle={category.channels.length.toString()}>
            {category.channels.map((channel) => {
              return (
                <List.Item
                  key={channel.id}
                  title={channel.title ?? ""}
                  subtitle={channel.subtitle}
                  icon={channel.icon}
                  keywords={channel.keywords}
                  accessories={[{ text: channel.lastTime }, { icon: channel.statusIcon }]}
                  actions={
                    <ActionPanel>
                      <Action
                        icon="mattermost-icon-rounded.png"
                        title={`Open in Mattermost (${preference.deepLinkType})`}
                        onAction={() => openChannel(channel)}
                      />
                      <Action.CopyToClipboard content={channel.mentionName} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
