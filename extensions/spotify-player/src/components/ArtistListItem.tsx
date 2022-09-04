import { Action, ActionPanel, Color, Icon, Image, List, showHUD } from "@raycast/api";
import _ from "lodash";
import { getArtistAlbums, play, startPlaySimilar } from "../spotify/client";
import { AlbumsList } from "./artistAlbums";

export default function ArtistListItem(props: { artist: SpotifyApi.ArtistObjectFull; spotifyInstalled: boolean }) {
  const { artist, spotifyInstalled } = props;
  const icon: Image.ImageLike = {
    source: _(artist.images).last()?.url ?? "",
    mask: Image.Mask.RoundedRectangle,
  };
  const title = `${artist.name}`;
  return (
    <List.Item
      title={title}
      subtitle={artist.genres.join(", ")}
      icon={icon}
      detail={<ArtistDetail artist={artist} />}
      actions={<ArtistsActionPanel title={title} artist={artist} spotifyInstalled={spotifyInstalled} />}
    />
  );
}

function ArtistsActionPanel(props: { title: string; artist: SpotifyApi.ArtistObjectFull; spotifyInstalled: boolean }) {
  const { title, artist, spotifyInstalled } = props;
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
      {albums && (
        <Action.Push
          title="Open Albums"
          icon={Icon.ArrowRight}
          target={<AlbumsList albums={albums} spotifyInstalled={spotifyInstalled} />}
        />
      )}
      <Action
        title="Start Radio"
        icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
        onAction={async () => {
          const artistId = artist.id.replace("spotify:artist:", "");
          await startPlaySimilar({ seed_artists: artistId });
          showHUD(`♫ Playing Similar – ♫ ${artist.name}`);
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

function ArtistDetail(props: { artist: SpotifyApi.ArtistObjectFull }) {
  const response = getArtistAlbums(props.artist.id);
  const albums = response.result?.items;

  return (
    <List.Item.Detail isLoading={response.isLoading} markdown={getArtistDetailMarkdownContent(props.artist, albums)} />
  );
}

const getArtistDetailMarkdownContent = (
  artist: SpotifyApi.ArtistObjectFull,
  albums: SpotifyApi.AlbumObjectSimplified[] | undefined
) => {
  let header = `# ${artist.name}\n_${artist.genres.join(", ")}_\n \n`;

  const artistCover = artist.images[1]?.url ?? _(artist.images).first()?.url;
  if (artistCover) {
    header += `![](${artistCover})\n\n`;
  }

  // Album list organised by type
  // eg. albumListByType.album = [album1, album2, album3, ...]
  // "Albums" without a known type (album, single, appears_on, compilation) will be added to unknown
  const albumListByType: { [key: string]: SpotifyApi.AlbumObjectSimplified[] } = {
    album: [],
    single: [],
    appears_on: [],
    compilation: [],
    unknown: [],
  };

  // Album type display names
  const albumTypeDisplayNames: { [key: string]: string } = {
    album: "Albums",
    single: "Singles",
    appears_on: "Appears On",
    compilation: "Compilations",
    unknown: "Other",
  };

  // Split into types
  albums?.forEach((album) => {
    if (albumListByType[album.album_type] === undefined) {
      albumListByType.unknown.push(album);
      return;
    }

    albumListByType[album.album_type].push(album);
  });

  let content = "";
  for (const type in albumListByType) {
    const albumList = albumListByType[type];
    const albumTypeDisplayName = albumTypeDisplayNames[type];

    if (albumList.length == 0) continue;

    content += `## ${albumTypeDisplayName}: \n`;
    content += albumList.map((album) => `• ${album.name}\n`).join(" \n");
    content += "\n";
  }

  return `${header}\n\n${content}`;
};
