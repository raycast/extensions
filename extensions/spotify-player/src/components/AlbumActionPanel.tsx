import { Action, ActionPanel, Icon } from "@raycast/api";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { TracksList } from "./TracksList";

type AlbumActionPanelProps = { album: SimplifiedAlbumObject };

export function AlbumActionPanel({ album }: AlbumActionPanelProps) {
  const title = album.name;

  return (
    <ActionPanel>
      <PlayAction id={album.id} type="album" />
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
