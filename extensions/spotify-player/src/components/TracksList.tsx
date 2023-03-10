import { List } from "@raycast/api";
import { useAlbumTracks } from "../hooks/useAlbumTracks";
import TrackListItem from "./TrackListItem";

type TracksListProps = { album: SpotifyApi.AlbumObjectSimplified };

export function TracksList({ album }: TracksListProps) {
  const { albumTracksData, albumTracksIsLoading } = useAlbumTracks({ albumId: album.id, limit: 24 });

  const tracks = albumTracksData?.items;

  return (
    <List searchBarPlaceholder="Search songs" isLoading={albumTracksIsLoading}>
      {tracks && tracks.map((track) => <TrackListItem key={track.id} track={track} album={album} />)}
    </List>
  );
}
