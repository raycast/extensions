import { Action, ActionPanel, Color, Grid, Icon, Image, List, showHUD, showToast } from "@raycast/api";
import _ from "lodash";
import { addTrackToQueue, getArtistAlbums, play, startPlaySimilar } from "../spotify/client";
import { trackTitle } from "../utils";
import { useSpotify } from "../utils/context";
import { AlbumsList } from "./artistAlbums";

export default function ArtistListItem(props: {
  track: SpotifyApi.TrackObjectSimplified;
  album: SpotifyApi.AlbumObjectSimplified;
}) {
  const { installed } = useSpotify();
  const { track } = props;

  const album = props.album;
  const title = track.name;
  const subtitle = track.artists[0].name;

  const icon: Image.ImageLike = {
    source: album.images[0].url,
  };

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
              play(track.uri);
            }}
          />
          {installed && track.id && (
            <Action
              title="Play Similar"
              icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
              onAction={() => {
                startPlaySimilar({ seed_tracks: track.id });
              }}
            />
          )}
          {installed && track.uri && (
            <Action
              title="Add To Queue"
              icon={Icon.Plus}
              onAction={() => {
                addTrackToQueue(track.uri).then((response) => {
                  if (!response.error) {
                    showToast({ title: "Added song to queue", message: title });
                  }
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "q" }}
            />
          )}
          <Action.OpenInBrowser
            title={`Show Track (${track.name.trim()})`}
            url={installed ? `spotify:track:${track.id}` : track.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          {album && (
            <Action.OpenInBrowser
              title={`Open Album (${album.name.trim()})`}
              url={installed ? `spotify:album:${album.id}` : album.external_urls.spotify}
              icon={icon}
              shortcut={{ modifiers: ["cmd"], key: "a" }}
            />
          )}
          <Action.OpenInBrowser
            title="Show Artist"
            url={installed ? `spotify:artist:${track.artists[0].id}` : track.artists[0].external_urls.spotify}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={track.external_urls.spotify}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

export function ArtistsActionPanel(props: { title: string; artist: SpotifyApi.ArtistObjectFull }) {
  const { title, artist } = props;
  const response = getArtistAlbums(artist.id);
  const albums = response.result?.items;

  const artistImage = _(artist.images).last()?.url;
  return (
    <ActionPanel title={title}>
      <Action
        title="Play"
        icon={Icon.Play}
        onAction={() => {
          play(undefined, artist.uri);
        }}
      />
      {albums && <Action.Push title="Open Albums" icon={Icon.ArrowRight} target={<AlbumsList albums={albums} />} />}
      <Action
        title="Start Radio"
        icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
        onAction={async () => {
          const artistId = artist.id.replace("spotify:artist:", "");
          await startPlaySimilar({ seed_artists: artistId });
          showHUD(`♫ Playing Similar - ♫ ${artist.name}`);
        }}
      />
      <Action.OpenInBrowser
        title="Open Artist in Browser"
        icon={artistImage && { source: artistImage, mask: Image.Mask.Circle }}
        url={artist.external_urls.spotify}
      />

      <Action.CopyToClipboard
        title="Copy Artist URL"
        content={artist.external_urls.spotify}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
    </ActionPanel>
  );
}
