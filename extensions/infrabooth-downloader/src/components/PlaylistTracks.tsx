import { List } from "@raycast/api";
import { useStreamedList } from "../hooks/useStreamedList";
import { streamPlaylistTracks } from "../lib/api";
import type { LibraryPlaylist } from "../lib/mapping";
import type { RemoteTrack } from "@/lib/remote-protocol";
import { TrackListItem } from "./TrackListItem";

export function PlaylistTracks({ playlist }: { playlist: LibraryPlaylist }) {
  const { items, isLoading } = useStreamedList<RemoteTrack>(
    `playlist-tracks-${playlist.id}`,
    (onBatch, signal) => streamPlaylistTracks(playlist.id, playlist.secretToken, onBatch, signal),
    "Could not load tracks",
  );

  return (
    <List isLoading={isLoading} navigationTitle={playlist.title} searchBarPlaceholder="Filter tracks…">
      {items.map((track, index) => (
        <TrackListItem
          key={`${track.trackId}-${index}`}
          track={track}
          playContext={{ tracks: items, startIndex: index }}
        />
      ))}
    </List>
  );
}
