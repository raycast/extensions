// This whole file is unused

import { List, ActionPanel, Action, Image, Icon } from "@raycast/api";
import { play, playShuffled } from "../spotify/client";

export default function PlaylistListItem(props: {
  playlist: SpotifyApi.PlaylistObjectSimplified;
  spotifyInstalled: boolean;
}) {
  const playlist = props.playlist;

  const spotifyInstalled = props.spotifyInstalled;
  const imageURL = playlist.images[playlist.images.length - 1]?.url;
  const icon: Image.ImageLike = {
    source: imageURL ?? Icon.BlankDocument,
    mask: Image.Mask.Circle,
  };

  const title = playlist.name;
  const subtitle = playlist.owner.display_name;
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessories={[{ text: `${playlist.tracks.total.toString()} songs`, tooltip: "number of tracks" }]}
      icon={icon}
      actions={
        <ActionPanel title={title}>
          <Action
            title="Play"
            icon={Icon.Play}
            onAction={() => {
              play(undefined, playlist.uri);
            }}
          />
          <Action
            icon={Icon.Shuffle}
            title="Play Shuffled"
            onAction={() => {
              playShuffled(playlist.uri);
            }}
          />
          <Action.OpenInBrowser
            title={`Show Playlist (${playlist.name.trim()})`}
            url={spotifyInstalled ? `spotify:playlist:${playlist.id}` : playlist.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.OpenInBrowser
            title="Show Artist"
            url={spotifyInstalled ? `spotify:artist:${playlist.owner.id}` : playlist.owner.external_urls.spotify}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={playlist.external_urls.spotify}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
