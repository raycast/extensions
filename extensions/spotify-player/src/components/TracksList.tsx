import { List } from "@raycast/api";
import { SimplifiedAlbumObject, SimplifiedPlaylistObject, SimplifiedTrackObject } from "../helpers/spotify.api";
import { useAlbumTracks } from "../hooks/useAlbumTracks";
import { usePlaylistTracks } from "../hooks/usePlaylistTracks";
import TrackListItem from "./TrackListItem";

type TracksListProps = {
  album?: SimplifiedAlbumObject;
  playlist?: SimplifiedPlaylistObject;
  tracks?: SimplifiedTrackObject[];
  showGoToAlbum?: boolean;
};

export function TracksList({ album, playlist, tracks, showGoToAlbum }: TracksListProps) {
  const { albumTracksData, albumTracksIsLoading } = useAlbumTracks({
    albumId: album?.id,
    options: {
      execute: Boolean(album),
    },
  });

  const { playlistTracksData, playlistTracksIsLoading } = usePlaylistTracks({
    playlistId: playlist?.id,
    options: {
      execute: Boolean(playlist),
    },
  });

  const songs = albumTracksData?.items || playlistTracksData?.items || tracks;

  return (
    <List searchBarPlaceholder="Search songs" isLoading={albumTracksIsLoading || playlistTracksIsLoading}>
      {songs &&
        songs.map((track, index) => (
          <TrackListItem
            key={`${track.id}${index}`}
            playingContext={album?.uri || playlist?.uri}
            track={track}
            album={album || track.album}
            showGoToAlbum={showGoToAlbum}
          />
        ))}
    </List>
  );
}
