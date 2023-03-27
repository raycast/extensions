import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { play } from "../api/play";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
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
      <ActionPanel.Section>
        <Action.CopyToClipboard icon={Icon.Link} title="Copy URL" content={album?.external_urls?.spotify || ""} />
        {isSpotifyInstalled ? (
          <Action.Open icon="spotify-icon.png" title="Open on Spotify" target={album.uri} />
        ) : (
          <Action.OpenInBrowser
            title="Open on Spotify Web"
            url={album?.external_urls?.spotify || "https://play.spotify.com"}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
