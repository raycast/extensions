import { useCachedPromise } from "@raycast/utils";
import { getArtistAlbums } from "../api/getArtistAlbums";

type UseArtistAlbumsProps = {
  artistId?: string;
  limit?: number;
  options?: {
    execute?: boolean;
  };
};

export function useArtistAlbums({ artistId = "", limit = 50, options }: UseArtistAlbumsProps) {
  const { data, error, isLoading } = useCachedPromise(
    (artistId: string, limit: number) => getArtistAlbums(artistId, limit),
    [artistId, limit],
    {
      execute: options?.execute !== false && !!artistId && !!limit,
    },
  );

  return { artistAlbumsData: data, artistAlbumsError: error, artistAlbumsIsLoading: isLoading };
}
