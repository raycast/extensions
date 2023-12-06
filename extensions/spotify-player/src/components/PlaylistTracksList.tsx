import { List } from "@raycast/api";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";
import { usePlaylistTracks } from "../hooks/usePlaylistTracks";
import TrackListItem from "./TrackListItem";

type PlaylistTracksListProps = {
  playlist: SimplifiedPlaylistObject;
  showGoToAlbum?: boolean;
};

export function PlaylistTracksList({ playlist, showGoToAlbum = true }: PlaylistTracksListProps) {
  const { playlistTracksData, playlistTracksIsLoading, playlistTracksPagination } = usePlaylistTracks({
    playlistId: playlist.id,
  });

  const tracks = playlistTracksData?.items ?? [];

  return (
    <List searchBarPlaceholder="Search songs" isLoading={playlistTracksIsLoading} pagination={playlistTracksPagination}>
      {tracks.map((track, index) => (
        <TrackListItem
          key={`${track.id}${index}`}
          playingContext={playlist.uri}
          track={track}
          album={track.album}
          showGoToAlbum={showGoToAlbum}
        />
      ))}
    </List>
  );
}
