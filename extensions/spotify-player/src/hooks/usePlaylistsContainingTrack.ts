import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";
import { playlistContainsTrack } from "../api/playlistContainsTrack";

type UsePlaylistsContainingTrackProps = {
  playlists: SimplifiedPlaylistObject[];
  trackUri?: string;
  options?: { execute?: boolean };
};

export function usePlaylistsContainingTrack({ playlists, trackUri, options }: UsePlaylistsContainingTrackProps) {
  const abortable = useRef<AbortController | null>(null);
  const { data, isLoading, revalidate } = usePromise(
    async (ids: string[], uri: string) => {
      const signal = abortable.current?.signal;
      const containingIds: string[] = [];
      // These consumers display membership across the catalog. Walk it sequentially;
      // each check discards its page before fetching the next one.
      for (const id of ids) {
        signal?.throwIfAborted();
        if (await playlistContainsTrack(id, uri, signal)) containingIds.push(id);
      }
      return { uri, ids: containingIds };
    },
    [playlists.flatMap((playlist) => (playlist.id ? [playlist.id] : [])), trackUri ?? ""],
    { execute: options?.execute !== false && playlists.length > 0 && !!trackUri, abortable },
  );

  return {
    playlistsContainingTrack: data && data.uri === trackUri ? data.ids : [],
    playlistsContainingTrackIsLoading: isLoading,
    playlistsContainingTrackRevalidate: revalidate,
  };
}
