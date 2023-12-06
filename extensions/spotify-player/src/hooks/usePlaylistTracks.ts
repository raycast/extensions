import { useCachedPromise } from "@raycast/utils";
import { getPlaylistTracks } from "../api/getPlaylistTracks";

const PAGE_SIZE = 50;

type UsePlaylistTracksProps = {
  playlistId?: string;
  options?: {
    execute?: boolean;
  };
};

export function usePlaylistTracks({ playlistId = "", options }: UsePlaylistTracksProps) {
  const { data, error, isLoading, pagination } = useCachedPromise(
    (playlistId: string) =>
      async ({ page }) => {
        const offset = page * PAGE_SIZE;
        const response = await getPlaylistTracks(playlistId, PAGE_SIZE, offset);
        return {
          data: response.items ?? [],
          hasMore: (response.items?.length ?? 0) >= PAGE_SIZE,
        };
      },
    [playlistId],
    {
      execute: options?.execute !== false && !!playlistId,
    },
  );

  return {
    playlistTracksData: data ? { items: data } : undefined,
    playlistTracksError: error,
    playlistTracksIsLoading: isLoading,
    playlistTracksPagination: pagination,
  };
}
