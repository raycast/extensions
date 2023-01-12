import { Action, ActionPanel, Color, Icon, Image, List, showHUD } from "@raycast/api";
import _ from "lodash";
import { getArtistAlbums, play, startPlaySimilar } from "../spotify/client";
import { AlbumsList } from "./artistAlbums";

export default function ArtistListItem(props: { artist: SpotifyApi.ArtistObjectFull }) {
  const { artist } = props;
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
      actions={<ArtistsActionPanel title={title} artist={artist} />}
    />
  );
}

function ArtistsActionPanel(props: { title: string; artist: SpotifyApi.ArtistObjectFull }) {
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
    // album: [], // spotifyapi:"album"
    // single: [], // spotifyapi:"single"
    // appears_on: [], // spotifyapi:"appears_on"
    main_albums: [], // ours:"main_albums", albums from this artist
    main_singles: [], // ours:"main_singles", singles / eps from this artist
    featured_albums: [], // ours:"featured_albums", albums this artist featured on
    featured_singles: [], // ours:"featured_singles", singles / eps this artist featured on
    compilation: [], // spotifyapi:"compilation"
    unknown: [], // ours:"unknown", albums that don't fit into other categories
  };

  // Album type display names
  // To enable showing albums with a specific album type, they need a display name
  const albumTypeDisplayNames: { [key: string]: string } = {
    // album: "Albums",
    // single: "Singles",
    // appears_on: "Appears On",
    main_albums: "Albums",
    main_singles: "Singles and EPs",
    // featured_albums: "Featured albums",
    // featured_singles: "Featured singles"
    compilation: "Appears on",
    unknown: "Other",
  };

  // Split into types
  // For each album this artist is on, figure out where it should go:
  albums?.forEach((album) => {
    // Album that's their own:
    if (album.artists[0].id == artist.id) {
      if (album.album_type == "album") albumListByType.main_albums.push(album); // main album
      else if (album.album_type == "single") albumListByType.main_singles.push(album); // main single
      return;
    }

    // Album that's not their own: featured album
    if (album.album_type == "album") {
      albumListByType.featured_albums.push(album);
      return;
    }

    // Single that's not their own: featured single
    if (album.album_type == "single") {
      albumListByType.featured_singles.push(album);
      return;
    }

    // Handle types from the Spotify API
    if (albumListByType[album.album_type] !== undefined) {
      albumListByType[album.album_type].push(album);
      return;
    }

    // Handle unknown types
    albumListByType.unknown.push(album);
  });

  // Create markdown for content
  let content = "";
  for (const type in albumListByType) {
    const albumList = albumListByType[type];
    const albumTypeDisplayName = albumTypeDisplayNames[type];
    const shownAlbumNames: { [key: string]: boolean } = {};

    // Don't show album types without a display name
    if (albumTypeDisplayName === undefined) continue;

    // Don't show empty album types
    if (albumList.length == 0) continue;

    content += `## ${albumTypeDisplayName}: \n`;
    content += albumList
      .map((album) => {
        if (!shownAlbumNames[album.name]) {
          shownAlbumNames[album.name] = true;
          return `• ${album.name}\n`;
        }
      })
      .join(" \n");
    content += "\n";
  }

  return `${header}\n\n${content}`;
};
