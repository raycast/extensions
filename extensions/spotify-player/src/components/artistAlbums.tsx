import { getArtistAlbums } from "../spotify/client";
import { List } from "@raycast/api";
import AlbumListItem from "./AlbumListItem";

export function AlbumsList(props: { albums: SpotifyApi.AlbumObjectSimplified[] }) {
  const { albums } = props;

  return (
    <List searchBarPlaceholder="Search albums by keywords..." throttle isShowingDetail>
      {albums
        .sort((t) => Date.parse(t.release_date))
        .map((t: SpotifyApi.AlbumObjectSimplified) => (
          <AlbumListItem key={t.id} album={t} showDetails={false} />
        ))}
    </List>
  );
}

export function AlbumsListByArtist(props: { artistId: string }) {
  const { artistId } = props;
  const response = getArtistAlbums(artistId);
  const albums = response.result?.items;
  return (
    <List navigationTitle="Search Albums" searchBarPlaceholder="Search albums by keywords..." throttle isShowingDetail>
      {albums &&
        albums
          .sort((t) => Date.parse(t.release_date))
          .map((t: SpotifyApi.AlbumObjectSimplified) => <AlbumListItem key={t.id} album={t} showDetails />)}
    </List>
  );
}
