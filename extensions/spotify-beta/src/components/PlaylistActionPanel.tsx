import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { play } from "../api/play";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";
import { FooterAction } from "./FooterAction";
import { TracksList } from "./TracksList";

type PlaylistActionPanelProps = {
  title: string;
  playlist: SimplifiedPlaylistObject;
};

export function PlaylistActionPanel({ title, playlist }: PlaylistActionPanelProps) {
  return (
    <ActionPanel>
      <Action
        title="Play"
        icon={Icon.Play}
        onAction={async () => {
          await play({ id: playlist.id, type: "playlist" });
          showHUD(`Playing ${title}`);
        }}
      />
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
