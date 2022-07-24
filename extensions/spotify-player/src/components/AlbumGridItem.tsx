import { Action, ActionPanel, Grid, Icon, Image, List } from "@raycast/api";
import { play, playShuffled } from "../spotify/client";

export default function AlbumGridItem(props: { album: SpotifyApi.AlbumObjectSimplified; spotifyInstalled: boolean }) {
  const album = props.album;
  const spotifyInstalled = props.spotifyInstalled;
  const icon: Image.ImageLike = {
    source: album.images[0]?.url,
  };

  const title = album.name;
  const subtitle = `${album.artists.map((a) => a.name).join(", ")} • ${album.release_date.substring(
    0,
    4
  )} • ${album.total_tracks.toString()} songs`;
  return (
    <Grid.Item
      title={title}
      subtitle={subtitle}
      content={icon}
      actions={
        <ActionPanel title={title}>
          <Action
            title="Play"
            icon={Icon.Play}
            onAction={() => {
              play(undefined, album.uri);
            }}
          />
          <Action
            icon={Icon.Shuffle}
            title="Play Shuffled"
            onAction={() => {
              playShuffled(album.uri);
            }}
          />
          <Action.OpenInBrowser
            title={`Show Album (${album.name.trim()})`}
            url={spotifyInstalled ? `spotify:album:${album.id}` : album.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.OpenInBrowser
            title="Show Artist"
            url={spotifyInstalled ? `spotify:artist:${album.artists[0].id}` : album.artists[0].external_urls.spotify}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={album.external_urls.spotify}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
