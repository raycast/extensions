import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { play } from "../api/play";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { FooterAction } from "./FooterAction";
import { TracksList } from "./TracksList";

type AlbumActionPanelProps = { album: SimplifiedAlbumObject };

export function AlbumActionPanel({ album }: AlbumActionPanelProps) {
  const title = album.name;

  return (
    <ActionPanel>
      <Action
        title="Play"
        icon={Icon.Play}
        onAction={async () => {
          await play({ id: album.id, type: "album" });
          showHUD(`Playing ${title}`);
        }}
      />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Songs"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<TracksList album={album} showGoToAlbum={false} />}
      />
      <FooterAction url={album?.external_urls?.spotify} uri={album.uri} title={title} />
    </ActionPanel>
  );
}
