import { getAlbumTracks, getArtistAlbums, spotifyApi } from "./client/client";
import { List, ActionPanel, Action, Image, Icon, showToast, Toast } from "@raycast/api";
import _ from "lodash";
import { TracksList } from "./searchTracks";

export function AlbumsList(props: { albums: SpotifyApi.AlbumObjectSimplified[] }) {
  const albums = props.albums;

  return (
    <List searchBarPlaceholder="Search albums by keywords..." throttle isShowingDetail>
      {albums
        .sort((t) => Date.parse(t.release_date))
        .map((t: SpotifyApi.AlbumObjectSimplified) => (
          <AlbumListItem key={t.id} album={t} />
        ))}
    </List>
  );
}

export function AlbumsListByArtist(props: { artistId: string }) {
  const response = getArtistAlbums(props.artistId);
  const albums = response.result?.items;
  return (
    <List navigationTitle="Search Albums" searchBarPlaceholder="Search albums by keywords..." throttle isShowingDetail>
      {albums &&
        albums
          .sort((t) => Date.parse(t.release_date))
          .map((t: SpotifyApi.AlbumObjectSimplified) => <AlbumListItem key={t.id} album={t} />)}
    </List>
  );
}

function AlbumListItem(props: { album: SpotifyApi.AlbumObjectSimplified }) {
  const album = props.album;
  const icon: Image.ImageLike = {
    source: album.images[album.images.length - 1]?.url,
    mask: Image.Mask.Circle,
  };
  const releaseYear = new Date(album.release_date).getFullYear();
  const title = `${album.name} • ${releaseYear}`;
  return (
    <List.Item
      title={title}
      icon={icon}
      detail={<AlbumDetail album={album} />}
      actions={
        <ActionPanel title={title}>
          <Action
            title="Play Album"
            icon={{ source: { light: "play-light.png", dark: "play-dark.png" } }}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Started Playing Album",
                message: album.name,
              });
              try {
                await spotifyApi
                  .play({ context_uri: `spotify:album:${album.id}` })
                  .catch((error: SpotifyApi.ErrorObject) => {
                    console.error(error);
                    if (error) {
                      toast.style = Toast.Style.Failure;
                      toast.title = error.message;
                    } else {
                      toast.style = Toast.Style.Success;
                    }
                  });
                toast.title = "Enjoy the Music!";
                toast.style = Toast.Style.Success;
              } catch (e: any) {
                toast.style = Toast.Style.Failure;
                toast.title = (e as unknown as SpotifyApi.ErrorObject).message;
                console.error(e);
              }
            }}
          />
          <Action.Push title="Open Album" icon={Icon.ArrowRight} target={<TracksForAlbum albumId={album.id} />} />
          <Action.OpenInBrowser
            title={`Show Album in Browser (${album.name.trim()})`}
            url={album.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.OpenInBrowser title="Show Artist" url={album.artists[0].external_urls.spotify} />
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

function TracksForAlbum(props: { albumId: string }) {
  const response = getAlbumTracks(props.albumId);

  const tracks = response.result?.items as SpotifyApi.TrackObjectFull[];
  return <TracksList tracks={tracks} isLoading={response.isLoading} />;
}

function AlbumDetail(props: { album: SpotifyApi.AlbumObjectSimplified }) {
  const response = getAlbumTracks(props.album.id);
  const albums = response.result?.items;
  return (
    <List.Item.Detail isLoading={response.isLoading} markdown={getAlbumDetailMarkdownContent(props.album, albums)} />
  );
}

const getAlbumDetailMarkdownContent = (
  album: SpotifyApi.AlbumObjectSimplified,
  tracks: SpotifyApi.TrackObjectSimplified[] | undefined
) => {
  let header = `# ${album.name}\n`;

  const albumCover = _(album.images).first()?.url;
  if (albumCover) {
    header += `![](${albumCover})\n\n`;
  }

  const albumsString = tracks
    ?.map((a) => {
      return `• ${a.name}\n`;
    })
    .join(" \n");
  const content = `## Tracks: \n ${albumsString ?? "Loading..."}`;
  return `${header}\n\n${content}`;
};
