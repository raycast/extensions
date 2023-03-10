import { Action, ActionPanel, Color, Icon, Image, showHUD } from "@raycast/api";
import { play, startPlaySimilar } from "../spotify/client";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";
import { AlbumsList } from "./artistAlbums";
import useArtistAlbums from "../hooks/useArtistAlbums";

export function ArtistsActionPanel({ title, artist }: { title: string; artist: SpotifyApi.ArtistObjectFull }) {
  const { artistAlbumsData } = useArtistAlbums({ artistId: artist.id, limit: 24 });

  const albums = artistAlbumsData?.items;
  const artistImage = artist.images[0]?.url;

  return (
    <ActionPanel title={title}>
      <Action title="Play" icon={Icon.Play} onAction={() => play(undefined, artist.uri)} />
      {albums && <Action.Push title="Discography" icon={Icon.ArrowRight} target={<AlbumsList albums={albums} />} />}
      <Action
        title="Start Radio"
        icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
        onAction={async () => {
          const artistId = artist.id.replace("spotify:artist:", "");
          await startPlaySimilar([], [artistId]);
          showHUD(`♫ Playing Similar - ♫ ${artist.name}`);
        }}
      />
      <Action.OpenInBrowser
        icon={artistImage && { source: artistImage, mask: Image.Mask.Circle }}
        title="Open Artist on Spotify"
        url={isSpotifyInstalled ? `spotify:artist:${artist.id}` : artist.external_urls.spotify}
      />

      <Action.CopyToClipboard
        title="Copy Artist URL"
        content={{ html: "", text: artist.external_urls.spotify }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
    </ActionPanel>
  );
}
