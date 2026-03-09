import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";

interface TitlePresence {
  titleId: string;
  titleName: string;
  titleType: string;
  state: string; // "Active" | "Inactive"
  lastModified: string;
}

interface Friend {
  xuid: string;
  gamertag: string;
  modernGamertag: string;
  displayName: string;
  displayPicRaw: string;
  gamerScore: string;
  presenceState: string; // "Online" | "Away" | "Offline"
  presenceText: string;
  lastSeenDateTimeUtc: string;
  titlePresences: TitlePresence[] | null;
  isBroadcasting: boolean;
}

interface FriendsResponse {
  people: Friend[];
}

function getStatusColor(presenceState: string): Color {
  switch (presenceState.toLowerCase()) {
    case "online":
      return Color.Green;
    case "away":
      return Color.Yellow;
    default:
      return Color.SecondaryText;
  }
}

function getActiveGame(friend: Friend): string | null {
  if (!friend.titlePresences?.length) return null;
  const active = friend.titlePresences.find((t) => t.state === "Active");
  return active?.titleName ?? null;
}

function formatLastSeen(dateStr: string): string {
  if (!dateStr || dateStr.startsWith("0001")) return "a while ago";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();

  const { data, isLoading, revalidate } = useFetch<FriendsResponse>(
    "https://xbl.io/api/v2/friends",
    {
      headers: {
        "X-Authorization": apiKey,
        Accept: "application/json",
      },
      keepPreviousData: true,
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load Xbox friends",
          message: error.message.includes("401")
            ? "Invalid API key — check your OpenXBL key in preferences."
            : error.message,
        });
      },
    },
  );

  const { online, away, offline } = useMemo(() => {
    const people = [...(data?.people ?? [])].sort((a, b) =>
      a.gamertag.toLowerCase().localeCompare(b.gamertag.toLowerCase()),
    );
    return {
      online: people.filter((f) => f.presenceState.toLowerCase() === "online"),
      away: people.filter((f) => f.presenceState.toLowerCase() === "away"),
      offline: people.filter(
        (f) => !["online", "away"].includes(f.presenceState.toLowerCase()),
      ),
    };
  }, [data]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search friends..."
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {!isLoading && !data?.people?.length && (
        <List.EmptyView
          title="No friends found"
          description="Make sure your OpenXBL API key is correct."
          icon={Icon.Person}
        />
      )}

      {online.length > 0 && (
        <List.Section title={`Online  ·  ${online.length}`}>
          {online.map((friend) => (
            <FriendListItem
              key={friend.xuid}
              friend={friend}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}

      {away.length > 0 && (
        <List.Section title={`Away  ·  ${away.length}`}>
          {away.map((friend) => (
            <FriendListItem
              key={friend.xuid}
              friend={friend}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}

      {offline.length > 0 && (
        <List.Section title={`Offline  ·  ${offline.length}`}>
          {offline.map((friend) => (
            <FriendListItem
              key={friend.xuid}
              friend={friend}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function FriendListItem({
  friend,
  onRefresh,
}: {
  friend: Friend;
  onRefresh: () => void;
}) {
  const state = friend.presenceState.toLowerCase();
  const isOnline = state === "online";
  const isAway = state === "away";
  const activeGame = getActiveGame(friend);
  const statusColor = getStatusColor(friend.presenceState);

  const subtitle =
    isOnline || isAway
      ? (activeGame ?? friend.presenceText ?? friend.presenceState)
      : `Last seen ${formatLastSeen(friend.lastSeenDateTimeUtc)}`;

  const accessories: List.Item.Accessory[] = [
    {
      tag: { value: friend.presenceState, color: statusColor },
      tooltip: `Gamer Score: ${parseInt(friend.gamerScore ?? "0").toLocaleString()}`,
    },
  ];

  if ((isOnline || isAway) && activeGame) {
    accessories.unshift({
      icon: Icon.GameController,
      text: activeGame,
    });
  }

  if (friend.isBroadcasting) {
    accessories.unshift({
      icon: { source: Icon.Video, tintColor: Color.Red },
      tooltip: "Live broadcasting",
    });
  }

  const profileUrl = `https://www.xbox.com/play/user/${encodeURIComponent(friend.modernGamertag || friend.gamertag)}`;

  return (
    <List.Item
      title={friend.gamertag}
      subtitle={subtitle}
      icon={
        friend.displayPicRaw
          ? { source: friend.displayPicRaw, mask: Image.Mask.Circle }
          : { source: Icon.Person, tintColor: Color.SecondaryText }
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="View Xbox Profile"
            url={profileUrl}
            icon={Icon.Globe}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.CopyToClipboard
            title="Copy Gamertag"
            content={friend.gamertag}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
