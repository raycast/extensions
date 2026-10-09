import { useCachedPromise } from "@raycast/utils";
import type { RemoteTrack } from "@/lib/remote-protocol";
import {
  getMixes,
  streamLibraryArtworks,
  streamLibraryPlaylists,
  streamLikedTracks,
  type PlaylistArtwork,
} from "../lib/api";
import { handleError } from "../lib/feedback";
import type { LibraryPlaylist } from "../lib/mapping";
import type { LibrarySearchType, Results } from "../lib/searchTypes";
import { useStreamedList } from "./useStreamedList";

interface LibraryState {
  results: Results;
  isLoading: boolean;
}

export function withArtworks(playlists: LibraryPlaylist[], artworks: PlaylistArtwork[]): LibraryPlaylist[] {
  const byId = new Map(artworks.map((artwork) => [artwork.id, artwork.url]));
  return playlists.map((p) => (p.artworkUrl ? p : { ...p, artworkUrl: byId.get(p.id) ?? null }));
}

export function useLibraries(): Record<LibrarySearchType, LibraryState> {
  const liked = useStreamedList<RemoteTrack>("liked-tracks", streamLikedTracks, "Loading liked tracks failed");
  const playlists = useStreamedList<LibraryPlaylist>(
    "library-playlists",
    streamLibraryPlaylists,
    "Loading playlists failed",
  );
  const artworks = useStreamedList<PlaylistArtwork>(
    "library-artworks",
    streamLibraryArtworks,
    "Loading playlist artwork failed",
    { enabled: !playlists.isLoading, appendToCache: true },
  );
  const mixes = useCachedPromise(getMixes, [], {
    onError: (error) => void handleError(error, "Loading mixes failed"),
  });
  return {
    tracks: { results: { kind: "tracks", tracks: liked.items }, isLoading: liked.isLoading },
    playlists: {
      results: { kind: "playlists", playlists: withArtworks(playlists.items, artworks.items) },
      isLoading: playlists.isLoading,
    },
    mixes: { results: { kind: "mixes", mixes: mixes.data ?? [] }, isLoading: mixes.isLoading },
  };
}
