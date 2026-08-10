import { useCachedPromise } from "@raycast/utils";
import { getAlbumTracks } from "../api/getAlbumTracks";

type UseAlbumTracksProps = {
  albumId?: string;
  limit?: number;
  options?: {
    execute?: boolean;
  };
};

export function useAlbumTracks({ albumId = "", limit = 50, options }: UseAlbumTracksProps) {
  const { data, error, isLoading } = useCachedPromise(
    (albumId: string, limit: number) => getAlbumTracks({ albumId, limit }),
    [albumId, limit],
    {
      execute: options?.execute !== false && !!albumId && !!limit,
    },
  );

  return { albumTracksData: data, albumTracksError: error, albumTracksIsLoading: isLoading };
}
