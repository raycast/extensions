import { useCachedPromise } from "@raycast/utils";
import { getAlbumTracks } from "../api/getAlbumTracks";

const PAGE_SIZE = 50;

type UseAlbumTracksProps = {
  albumId?: string;
  options?: {
    execute?: boolean;
  };
};

export function useAlbumTracks({ albumId = "", options }: UseAlbumTracksProps) {
  const { data, error, isLoading, pagination } = useCachedPromise(
    (albumId: string) =>
      async ({ page }) => {
        const offset = page * PAGE_SIZE;
        const response = await getAlbumTracks({ albumId, limit: PAGE_SIZE, offset });
        return {
          data: response.items ?? [],
          hasMore: (response.items?.length ?? 0) >= PAGE_SIZE,
        };
      },
    [albumId],
    {
      execute: options?.execute !== false && !!albumId,
    },
  );

  return {
    albumTracksData: data ? { items: data } : undefined,
    albumTracksError: error,
    albumTracksIsLoading: isLoading,
    albumTracksPagination: pagination,
  };
}
