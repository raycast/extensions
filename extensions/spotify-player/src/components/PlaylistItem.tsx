import { ActionPanel, Action, Image, Icon } from "@raycast/api";
import { play, playShuffled } from "../spotify/client";
import { useSpotify } from "../utils/context";
import { ListOrGridItem } from "./ListOrGridItem";

export default function PlaylistItem({
  playlist,
  type,
}: {
  playlist: SpotifyApi.PlaylistObjectSimplified;
  type: "grid" | "list";
}) {
  const { installed } = useSpotify();

  const title = playlist.name;
  const subtitle = playlist.owner.display_name;
  const imageURL = playlist.images[playlist.images.length - 1]?.url;
  const icon: Image.ImageLike = {
    source: imageURL ?? Icon.BlankDocument,
  };

  const actions = (
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
  );

  return (
    <ListOrGridItem
      content={icon}
      type={type}
      title={title}
      subtitle={subtitle}
      accessories={[{ text: `${playlist.tracks.total.toString()} songs`, tooltip: "number of tracks" }]}
      icon={icon}
      actions={actions}
    />
  );
}
