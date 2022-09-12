import { Action, ActionPanel, Icon, Image } from "@raycast/api";
import { TracksList } from "../searchTracks";
import { getAlbumTracks, play, playShuffled } from "../spotify/client";

export function AlbumsActionPanel(props: { album: SpotifyApi.AlbumObjectSimplified; spotifyInstalled: boolean }) {
  const album = props.album;
  const spotifyInstalled = props.spotifyInstalled;
  const icon: Image.ImageLike = {
    source: album.images[album.images.length - 1]?.url,
    mask: Image.Mask.Circle,
  };

  const title = album.name;

  return (
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
      <Action.Push
        title="Open Album"
        icon={Icon.ArrowRight}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<TracksForAlbum albumId={album.id} />}
      />
      <Action.OpenInBrowser
        title={`Show Album (${album.name.trim()})`}
        url={spotifyInstalled ? `spotify:album:${album.id}` : album.external_urls.spotify}
        icon={icon}
        shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
      />
      <Action.OpenInBrowser
        title="Show Artist"
        url={spotifyInstalled ? `spotify:artist:${album.artists[0].id}` : album.artists[0].external_urls.spotify}
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

function TracksForAlbum(props: { albumId: string }) {
  const response = getAlbumTracks(props.albumId);

  const tracks = response.result?.items as SpotifyApi.TrackObjectFull[];
  return <TracksList tracks={tracks} isLoading={response.isLoading} />;
}
