import { Action, ActionPanel, Icon, Image, showHUD } from "@raycast/api";
import { play } from "../api/play";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";
import { TracksList } from "./TracksList";

type AlbumActionPanelProps = { album: SpotifyApi.AlbumObjectSimplified };

export function AlbumActionPanel({ album }: AlbumActionPanelProps) {
  const title = album.name;
  const icon: Image.ImageLike = {
    source: album.images[album.images.length - 1]?.url,
    mask: Image.Mask.Circle,
  };

  return (
    <ActionPanel title={title}>
      <Action
        title="Play"
        icon={Icon.Play}
        onAction={async () => {
          await play({ contextUri: album.uri });
          showHUD(`Playing ${title}`);
        }}
      />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Open Album"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<TracksList album={album} />}
      />
      <Action.OpenInBrowser
        icon={icon}
        title={`Show Album (${album.name.trim()})`}
        url={isSpotifyInstalled ? `spotify:album:${album.id}` : album.external_urls.spotify}
        shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
      />
      <Action.CopyToClipboard
        icon={Icon.Link}
        title="Copy URL"
        content={album.external_urls.spotify}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
      <Action.OpenInBrowser
        title="Open on Spotify"
        url={isSpotifyInstalled ? `spotify:artist:${album.artists[0].id}` : album.artists[0].external_urls.spotify}
        shortcut={{ modifiers: ["cmd", "ctrl"], key: "a" }}
      />
    </ActionPanel>
  );
}
