import { ReactNode, useState } from "react";
import { RawMediaItem, buildUrl } from "../utils/jellyfinApi";
import { showToast, Toast, Action, Icon, Grid, ActionPanel } from "@raycast/api";
import fetch from "node-fetch";
import { getErrorMessage } from "../utils/errors";
import { getPreferences } from "../utils/preferences";
import ListMediaCommand from "../list-movies-series";

const preferences = getPreferences();

function createFavoriteHandler(item: RawMediaItem, favorite: boolean, update: (newValue: boolean) => void) {
  const favoriteUrl = buildUrl(["Users", preferences.jellyfinUserID, "FavoriteItems", item.Id]);
  return async () => {
    try {
      const resp = await fetch(favoriteUrl, { method: favorite ? "POST" : "DELETE" });
      if (!resp.ok) {
        throw new Error(`server returned status ${resp.status}`);
      }
      update(favorite);
      showToast({
        title: "❤️",
        message: `${favorite ? "Marked" : "Unmarked"} '${item.Name}' as Favorite`,
        style: Toast.Style.Success,
      });
    } catch (e) {
      showToast({
        title: "❤️",
        message: `Cannot Mark Item: ${getErrorMessage(e)}`,
        style: Toast.Style.Failure,
      });
    }
  };
}

function createWatchedHandler(item: RawMediaItem, watched: boolean, update: (newValue: boolean) => void) {
  const favoriteUrl = buildUrl(["Users", preferences.jellyfinUserID, "PlayedItems", item.Id]);
  return async () => {
    try {
      const resp = await fetch(favoriteUrl, { method: watched ? "POST" : "DELETE" });
      if (!resp.ok) {
        throw new Error(`server returned status ${resp.status}`);
      }
      update(watched);
      showToast({
        title: "❤️",
        message: `${watched ? "Marked" : "Unmarked"} '${item.Name}' as Watched`,
        style: Toast.Style.Success,
      });
    } catch (e) {
      showToast({
        title: "❤️",
        message: `Cannot Mark Item: ${getErrorMessage(e)}`,
        style: Toast.Style.Failure,
      });
    }
  };
}

export default function MediaGridItem({
  item,
  pushNavigation,
}: {
  item: RawMediaItem;
  pushNavigation?: (component: ReactNode) => void;
}): JSX.Element {
  const [isFavorite, setIsFavorite] = useState<boolean>(item.UserData.IsFavorite);
  const [isWatched, setIsWatched] = useState<boolean>(item.UserData.Played);

  const coverUrl = buildUrl(["Items", item.Id, "Images", "Primary"], {
    fillHeight: "600",
    fillWidth: "400",
    quality: "97",
    tag: item.ImageTags.Primary,
  });
  const mediaUrl = buildUrl(["web", "index.html#!", "details"], {
    id: item.Id,
    serverId: item.ServerId,
  });
  const streamUrl = buildUrl(["Items", item.Id, "Download"], {
    ApiKey: preferences.jellyfinApiKey,
  });

  const accessory: Grid.Item.Accessory = {};
  if (isWatched) {
    accessory.icon = Icon.Check;
    accessory.tooltip = "Watched";
  }
  if (isFavorite) {
    accessory.icon = Icon.Heart;
    accessory.tooltip = "Favorite";
  }

  const subtitle: string[] = [];
  if (item.ProductionYear) {
    subtitle.push(`${item.ProductionYear}`);
  }
  if (item.CommunityRating) {
    subtitle.push(`${Math.round(item.CommunityRating * 100) / 100}★`);
  }

  const actions = [
    <Action.OpenInBrowser title="Open in Browser" url={mediaUrl} />,
    isWatched ? (
      <Action
        title="Unmark Watched"
        icon={Icon.EyeDisabled}
        style={Action.Style.Destructive}
        onAction={createWatchedHandler(item, false, setIsWatched)}
        shortcut={{ key: "w", modifiers: ["cmd", "shift"] }}
      />
    ) : (
      <Action
        title="Mark Watched"
        icon={Icon.Eye}
        onAction={createWatchedHandler(item, true, setIsWatched)}
        shortcut={{ key: "w", modifiers: ["cmd", "shift"] }}
      />
    ),
    isFavorite ? (
      <Action
        title="Unmark Favorite"
        icon={Icon.HeartDisabled}
        style={Action.Style.Destructive}
        onAction={createFavoriteHandler(item, false, setIsFavorite)}
        shortcut={{ key: "f", modifiers: ["cmd"] }}
      />
    ) : (
      <Action
        title="Mark Favorite"
        icon={Icon.Heart}
        onAction={createFavoriteHandler(item, true, setIsFavorite)}
        shortcut={{ key: "f", modifiers: ["cmd"] }}
      />
    ),
  ];

  switch (item.Type) {
    case "Movie":
    case "Series":
      actions.push(
        <Action.CopyToClipboard
          title="Copy Stream/Download URL"
          content={streamUrl}
          icon={Icon.Livestream}
          shortcut={{ key: "s", modifiers: ["cmd"] }}
        />
      );
      break;
    case "BoxSet":
      actions.unshift(
        <Action
          title="View Items"
          icon={Icon.Eye}
          onAction={() => {
            pushNavigation && pushNavigation(<ListMediaCommand parentId={item.Id} />);
          }}
        />
      );
  }

  return (
    <Grid.Item
      content={coverUrl}
      title={item.Name}
      subtitle={subtitle.join(" · ")}
      actions={<ActionPanel title="Media Actions">{...actions}</ActionPanel>}
      accessory={accessory}
    />
  );
}
