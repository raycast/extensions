import { List } from "@raycast/api";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { useAlbumTracks } from "../hooks/useAlbumTracks";
import TrackListItem from "./TrackListItem";

type AlbumTracksListProps = {
  album: SimplifiedAlbumObject;
  showGoToAlbum?: boolean;
};

export function AlbumTracksList({ album, showGoToAlbum = false }: AlbumTracksListProps) {
  const { albumTracksData, albumTracksIsLoading, albumTracksPagination } = useAlbumTracks({
    albumId: album.id,
  });

  const tracks = albumTracksData?.items ?? [];

  return (
    <List searchBarPlaceholder="Search songs" isLoading={albumTracksIsLoading} pagination={albumTracksPagination}>
      {tracks.map((track, index) => (
        <TrackListItem
          key={`${track.id}${index}`}
          playingContext={album.uri}
          track={track}
          album={album}
          showGoToAlbum={showGoToAlbum}
        />
      ))}
    </List>
  );
}
