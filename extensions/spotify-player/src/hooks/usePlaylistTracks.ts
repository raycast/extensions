import { useCachedPromise } from "@raycast/utils";
import { getPlaylistTracks } from "../api/getPlaylistTracks";

type UsePlaylistTracksProps = {
  playlistId?: string;
  limit?: number;
  options?: {
    execute?: boolean;
  };
};

export function usePlaylistTracks({ playlistId = "", limit = 50, options }: UsePlaylistTracksProps) {
  const { data, error, isLoading } = useCachedPromise(
    (playlistId: string, limit: number) => getPlaylistTracks(playlistId, limit),
    [playlistId, limit],
    {
      execute: options?.execute !== false && !!playlistId && !!limit,
    },
  );

  return {
    playlistTracksData: data,
    playlistTracksError: error,
    playlistTracksIsLoading: isLoading,
  };
}
