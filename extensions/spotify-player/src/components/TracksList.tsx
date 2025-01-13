import { List } from "@raycast/api";
import { SimplifiedPlaylistObject, SimplifiedTrackObject } from "../helpers/spotify.api";
import { useAlbumTracks } from "../hooks/useAlbumTracks";
import { usePlaylistTracks } from "../hooks/usePlaylistTracks";
import TrackListItem from "./TrackListItem";
import { useCallback, useMemo, useState } from "react";
import { MinimalTrack } from "../api/getMySavedTracks";

// Constants
const TRACKS_PER_PAGE = 50;
const LOAD_MORE_THRESHOLD = 10;

// Types
type MinimalAlbum = {
  id: string;
  name: string;
  images: { url: string }[];
};

type TracksListProps = {
  album?: MinimalAlbum;
  playlist?: SimplifiedPlaylistObject;
  tracks?: MinimalTrack[];
  showGoToAlbum?: boolean;
};

// Track transformation helper
const transformTrack = (track: SimplifiedTrackObject): MinimalTrack => ({
  id: track.id ?? "",
  name: track.name ?? "",
  artists: track.artists?.map((artist) => ({ name: artist.name ?? "" })) ?? [],
  album: {
    id: track.album?.id ?? "",
    name: track.album?.name ?? "",
    images: track.album?.images?.map((image) => ({ url: image.url ?? "" })) ?? [],
  },
  uri: track.uri ?? "",
  duration_ms: track.duration_ms ?? 0,
});

export function TracksList({ album, playlist, tracks, showGoToAlbum }: TracksListProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // Album tracks
  const { albumTracksData, albumTracksIsLoading } = useAlbumTracks({
    albumId: album?.id,
    options: {
      execute: Boolean(album),
    },
  });

  // Playlist tracks
  const { playlistTracksData, playlistTracksIsLoading } = usePlaylistTracks({
    playlistId: playlist?.id,
    options: {
      execute: Boolean(playlist),
    },
  });

  // Memoize transformed tracks
  const allTracks = useMemo(() => {
    if (tracks) return tracks;
    if (albumTracksData?.items) return albumTracksData.items.map(transformTrack);
    if (playlistTracksData?.items) return playlistTracksData.items.map(transformTrack);
    return undefined;
  }, [tracks, albumTracksData, playlistTracksData]);

  // Loading state
  const isLoading = albumTracksIsLoading || playlistTracksIsLoading;

  // Empty state
  if (!allTracks) {
    return (
      <List searchBarPlaceholder="Search songs" isLoading={isLoading}>
        <List.EmptyView title="No tracks found" />
      </List>
    );
  }

  // Pagination
  const startIndex = currentPage * TRACKS_PER_PAGE;
  const endIndex = startIndex + TRACKS_PER_PAGE;
  const currentTracks = allTracks.slice(startIndex, endIndex);
  const hasMore = endIndex < allTracks.length;

  // Selection change handler
  const handleSelectionChange = useCallback(
    (id: string | null) => {
      if (id && parseInt(id) >= endIndex - LOAD_MORE_THRESHOLD && hasMore) {
        setCurrentPage(currentPage + 1);
      }
    },
    [endIndex, hasMore, currentPage],
  );

  return (
    <List searchBarPlaceholder="Search songs" isLoading={isLoading} onSelectionChange={handleSelectionChange}>
      {currentTracks.map((track) => (
        <TrackListItem key={`${track.id}`} track={track} showGoToAlbum={showGoToAlbum} />
      ))}
    </List>
  );
}
