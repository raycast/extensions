import { Action, ActionPanel, Color, Icon, Image, showHUD } from "@raycast/api";
import { getArtistAlbums, play, startPlaySimilar } from "../spotify/client";
import { useSpotify } from "../utils/context";
import { AlbumsList } from "./artistAlbums";
import { ListOrGridItem } from "./ListOrGridItem";

export default function AlbumGridItem({
  artist,
  type,
}: {
  artist: SpotifyApi.ArtistObjectFull;
  type: "grid" | "list";
}) {
  const icon: Image.ImageLike = {
    source: artist.images[0]?.url ?? "",
    mask: type === "list" ? Image.Mask.Circle : undefined,
  };

  const title = `${artist.name}`;

  return (
    <ListOrGridItem
      type={type}
      title={title}
      content={icon}
      icon={icon}
      actions={<ArtistsActionPanel title={title} artist={artist} />}
    />
  );
}

export function ArtistsActionPanel({ title, artist }: { title: string; artist: SpotifyApi.ArtistObjectFull }) {
  const { installed } = useSpotify();
  const response = getArtistAlbums(artist.id);
  const albums = response.result?.items;

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
          await startPlaySimilar({ seed_artists: artistId });
          showHUD(`♫ Playing Similar - ♫ ${artist.name}`);
        }}
      />
      <Action.OpenInBrowser
        icon={artistImage && { source: artistImage, mask: Image.Mask.Circle }}
        title="Open Artist on Spotify"
        url={installed ? `spotify:artist:${artist.id}` : artist.external_urls.spotify}
      />

      <Action.CopyToClipboard
        title="Copy Artist URL"
        content={{ html: "", text: artist.external_urls.spotify }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
    </ActionPanel>
  );
}
