import { Action, ActionPanel, Icon } from "@raycast/api";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { TracksList } from "./TracksList";
import { RefreshAction } from "./RefreshAction";

type PlaylistActionPanelProps = {
  title: string;
  playlist: SimplifiedPlaylistObject;
  onRefresh?: () => void;
};

export function PlaylistActionPanel({ title, playlist, onRefresh }: PlaylistActionPanelProps) {
  return (
    <ActionPanel>
      <PlayAction id={playlist.id as string} type="playlist" />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Songs"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<TracksList playlist={playlist} />}
      />
      {onRefresh && <RefreshAction onRefresh={onRefresh} />}
      <FooterAction url={playlist?.external_urls?.spotify} uri={playlist.uri} title={title} />
    </ActionPanel>
  );
}
