import { useCachedPromise } from "@raycast/utils";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";
import getAllPlaylistItems from "../helpers/getAllPlaylistItems";

type UsePlaylistsContainingTrackProps = {
  playlists: SimplifiedPlaylistObject[];
  trackUri?: string;
  options?: {
    execute?: boolean;
  };
};

async function getPlaylistsContainingTrack(playlists: SimplifiedPlaylistObject[], trackUri: string): Promise<string[]> {
  const results = await Promise.allSettled(
    playlists.map(async (playlist) => {
      const uris = await getAllPlaylistItems(playlist);
      return { id: playlist.id as string, contains: uris.includes(trackUri) };
    }),
  );

  const containingIds: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.contains) {
      containingIds.push(result.value.id);
    }
  }
  return containingIds;
}

export function usePlaylistsContainingTrack({ playlists, trackUri, options }: UsePlaylistsContainingTrackProps) {
  const { data, isLoading, revalidate } = useCachedPromise(
    (playlists: SimplifiedPlaylistObject[], trackUri: string) => getPlaylistsContainingTrack(playlists, trackUri),
    [playlists, trackUri ?? ""],
    {
      execute: options?.execute !== false && playlists.length > 0 && !!trackUri,
    },
  );

  return {
    playlistsContainingTrack: data ?? [],
    playlistsContainingTrackIsLoading: isLoading,
    playlistsContainingTrackRevalidate: revalidate,
  };
}
