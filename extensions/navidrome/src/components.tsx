import { ActionPanel, Action, List, Icon, Image, Color } from "@raycast/api";
import {
  getCoverArtUrl,
  getNavidromeWebUrl,
  formatLongDuration,
  type Playlist,
} from "./api";

// List.EmptyView and Grid.EmptyView are the same component in @raycast/api,
// so this works inside both containers.
export function FetchEmptyView({
  error,
  isLoading,
  errorTitle,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  error: Error | undefined;
  isLoading: boolean;
  errorTitle: string;
  emptyIcon: Icon;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (error) {
    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title={errorTitle}
        description="Check your server URL and credentials in Raycast preferences"
      />
    );
  }
  if (isLoading) return null;
  return (
    <List.EmptyView
      icon={emptyIcon}
      title={emptyTitle}
      description={emptyDescription}
    />
  );
}

export function PlaylistItem({
  playlist,
  onAction,
}: {
  playlist: Playlist;
  onAction?: () => void;
}) {
  const url = getNavidromeWebUrl("playlist", playlist.id);
  const subtitleParts: string[] = [];
  if (playlist.comment) subtitleParts.push(playlist.comment);
  else if (playlist.owner) subtitleParts.push(`by ${playlist.owner}`);

  const accessories: List.Item.Accessory[] = [];
  if (playlist.songCount !== undefined) {
    accessories.push({
      text: `${playlist.songCount} track${playlist.songCount !== 1 ? "s" : ""}`,
    });
  }
  if (playlist.duration) {
    accessories.push({ text: formatLongDuration(playlist.duration) });
  }
  accessories.push({ tag: { value: "Playlist", color: Color.Orange } });

  return (
    <List.Item
      icon={
        playlist.coverArt
          ? {
              source: getCoverArtUrl(playlist.coverArt),
              mask: Image.Mask.RoundedRectangle,
            }
          : Icon.List
      }
      title={playlist.name}
      subtitle={subtitleParts.join(" · ")}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Navidrome"
            url={url}
            onOpen={onAction}
          />
          <Action.CopyToClipboard
            title="Copy Playlist Name"
            content={playlist.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
