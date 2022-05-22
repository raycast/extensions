import { useState } from "react";
import { getArtistAlbums, useArtistsSearch } from "./client/client";
import { showToast, List, ActionPanel, Action, Toast, Image, Icon } from "@raycast/api";
import _ from "lodash";
import { AlbumsList } from "./artistAlbums";

export default function ArtistsList() {
  const [searchText, setSearchText] = useState<string>();
  const response = useArtistsSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  return (
    <List
      searchBarPlaceholder="Drake, Linkin Park, Motorama..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
      isShowingDetail={!_(response.result?.artists.items).isEmpty()}
    >
      {response.result?.artists.items.map((t: SpotifyApi.ArtistObjectFull) => (
        <ArtistListItem key={t.id} artist={t} />
      ))}
    </List>
  );
}

function ArtistListItem(props: { artist: SpotifyApi.ArtistObjectFull }) {
  const artist = props.artist;
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
  const response = getArtistAlbums(props.artist.id);
  const albums = response.result?.items;

  const artistImage = _(props.artist.images).last()?.url;
  return (
    <ActionPanel title={props.title}>
      {albums && <Action.Push title="Open Albums" icon={Icon.ArrowRight} target={<AlbumsList albums={albums} />} />}
      <Action.OpenInBrowser
        title="Open Artist in Browser"
        icon={artistImage && { source: artistImage, mask: Image.Mask.Circle }}
        url={props.artist.external_urls.spotify}
      />
      <Action.CopyToClipboard
        title="Copy Artist URL"
        content={props.artist.external_urls.spotify}
        shortcut={{ modifiers: ["cmd"], key: "." }}
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
  let header = `# ${artist.name}\n_${artist.genres}_\n \n`;

  const artistCover = artist.images[1]?.url ?? _(artist.images).first()?.url;
  if (artistCover) {
    header += `![](${artistCover})\n\n`;
  }

  const albumsString = albums
    ?.map((a) => {
      return `• ${a.name}\n`;
    })
    .join(" \n");
  const content = `## Albums: \n ${albumsString}`;
  return `${header}\n\n${content}`;
};
