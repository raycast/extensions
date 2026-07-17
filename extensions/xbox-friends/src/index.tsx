import { Action, ActionPanel, Color, getPreferenceValues, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import type { Friend, FriendsResponse } from "./interfaces";
import { MOCK_FRIENDS } from "./mockData";

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
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86400_000) return `${Math.floor(diffMs / 3600_000)}h ago`;
  return `${Math.floor(diffMs / 86400_000)}d ago`;
}

export default function Command() {
  const { apiKey, useMockData } = getPreferenceValues<Preferences>();

  const { data, isLoading, revalidate } = useFetch<FriendsResponse>("https://xbl.io/api/v2/friends", {
    execute: !useMockData,
    headers: {
      "X-Authorization": apiKey ?? "",
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
  });

  const { online, away, offline } = useMemo(() => {
    const people = useMockData ? MOCK_FRIENDS : [...(data?.people ?? [])];
    const sorted = [...people].sort((a, b) => a.gamertag.toLowerCase().localeCompare(b.gamertag.toLowerCase()));
    return {
      online: sorted.filter((f) => f.presenceState.toLowerCase() === "online"),
      away: sorted.filter((f) => f.presenceState.toLowerCase() === "away"),
      offline: sorted.filter((f) => !["online", "away"].includes(f.presenceState.toLowerCase())),
    };
  }, [data, useMockData]);

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
      {!isLoading && !useMockData && !data?.people?.length && (
        <List.EmptyView
          title="No friends found"
          description="Make sure your OpenXBL API key is correct, or enable Mock Data in preferences to preview."
          icon={Icon.Person}
        />
      )}

      {online.length > 0 && (
        <List.Section title={`Online  ·  ${online.length}`}>
          {online.map((friend) => (
            <FriendListItem key={friend.xuid} friend={friend} onRefresh={revalidate} />
          ))}
        </List.Section>
      )}

      {away.length > 0 && (
        <List.Section title={`Away  ·  ${away.length}`}>
          {away.map((friend) => (
            <FriendListItem key={friend.xuid} friend={friend} onRefresh={revalidate} />
          ))}
        </List.Section>
      )}

      {offline.length > 0 && (
        <List.Section title={`Offline  ·  ${offline.length}`}>
          {offline.map((friend) => (
            <FriendListItem key={friend.xuid} friend={friend} onRefresh={revalidate} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function FriendListItem({ friend, onRefresh }: { friend: Friend; onRefresh: () => void }) {
  const { useMockData } = getPreferenceValues<Preferences>();
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

  const useMockAvatar = useMockData === true;
  const avatarSource = useMockAvatar
    ? `https://api.dicebear.com/9.x/open-peeps/svg?seed=${friend.gamertag}`
    : friend.displayPicRaw;

  return (
    <List.Item
      title={friend.gamertag}
      subtitle={subtitle}
      icon={
        avatarSource
          ? { source: avatarSource, mask: Image.Mask.Circle }
          : { source: Icon.Person, tintColor: Color.SecondaryText }
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View Xbox Profile" url={profileUrl} icon={Icon.Globe} />
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
