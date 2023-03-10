import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useAlbumTracks, play, playShuffled } from "../spotify/client";
import { useSpotify } from "../utils/context";
import TrackListItem from "./TrackListItem";

export function AlbumsActionPanel(props: { album: SpotifyApi.AlbumObjectSimplified }) {
  const { installed } = useSpotify();

  const { album } = props;

  const title = album.name;
  const icon: Image.ImageLike = {
    source: album.images[album.images.length - 1]?.url,
    mask: Image.Mask.Circle,
  };

  return (
    <ActionPanel title={title}>
      <Action title="Play" icon={Icon.Play} onAction={() => play(undefined, album.uri)} />
      <Action icon={Icon.Shuffle} title="Play Shuffled" onAction={() => playShuffled(album.uri)} />
      {/* {albums && <Action.Push title="Discography" icon={Icon.ArrowRight} target={<AlbumsList albums={albums} />} />} */}
      <Action.Push
        title="Open Album"
        icon={Icon.ArrowRight}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<TracksForAlbum album={album} />}
      />
      <Action.OpenInBrowser
        title={`Show Album (${album.name.trim()})`}
        url={installed ? `spotify:album:${album.id}` : album.external_urls.spotify}
        icon={icon}
        shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
      />
      <Action.OpenInBrowser
        title="Show Artist"
        url={installed ? `spotify:artist:${album.artists[0].id}` : album.artists[0].external_urls.spotify}
        shortcut={{ modifiers: ["cmd", "ctrl"], key: "a" }}
      />
      <Action.CopyToClipboard
        title="Copy URL"
        content={album.external_urls.spotify}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
    </ActionPanel>
  );
}

function TracksForAlbum({ album }: { album: SpotifyApi.AlbumObjectSimplified }) {
  const response = useAlbumTracks(album.id);

  const tracks = response.result?.items as SpotifyApi.TrackObjectFull[];

  return (
    <List
      navigationTitle="Search Tracks"
      searchBarPlaceholder="Search music by keywords"
      isLoading={response.isLoading}
    >
      {tracks &&
        tracks
          .sort((t) => t.popularity)
          .map((t: SpotifyApi.TrackObjectFull) => <TrackListItem key={t.id} track={t} album={album} />)}
    </List>
  );
}
