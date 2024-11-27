import { Action, ActionPanel, Icon } from "@raycast/api";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { TracksList } from "./TracksList";

type PlaylistActionPanelProps = {
  title: string;
  playlist: SimplifiedPlaylistObject;
};

export function PlaylistActionPanel({ title, playlist }: PlaylistActionPanelProps) {
  return (
    <ActionPanel>
      <PlayAction id={playlist.id as string} type="playlist" />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Songs"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<TracksList playlist={playlist} />}
      />
      <FooterAction url={playlist?.external_urls?.spotify} uri={playlist.uri} title={title} />
    </ActionPanel>
  );
}
