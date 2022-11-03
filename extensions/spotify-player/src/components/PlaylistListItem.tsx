// This whole file is unused

import { List, ActionPanel, Action, Image, Icon } from "@raycast/api";
import { play, playShuffled } from "../spotify/client";
import { useSpotify } from "../utils/context";

export default function PlaylistListItem(props: { playlist: SpotifyApi.PlaylistObjectSimplified }) {
  const { installed } = useSpotify();

  const { playlist } = props;

  const title = playlist.name;
  const subtitle = playlist.owner.display_name;
  const imageURL = playlist.images[playlist.images.length - 1]?.url;
  const icon: Image.ImageLike = {
    source: imageURL ?? Icon.BlankDocument,
    mask: Image.Mask.Circle,
  };

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
            url={installed ? `spotify:playlist:${playlist.id}` : playlist.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
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
