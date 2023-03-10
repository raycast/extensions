import { useCachedPromise } from "@raycast/utils";
import { getArtistAlbums } from "../api/getArtistAlbums";

type UseSearchProps = {
  artistId: string;
  limit: number;
  options?: {
    execute?: boolean;
  };
};

export default function useSearch({ artistId, limit = 50, options }: UseSearchProps) {
  const { data, error, isLoading } = useCachedPromise(
    (artistId: string, limit: number) => getArtistAlbums(artistId, limit),
    [artistId, limit],
    {
      execute: options?.execute !== false && !!artistId && !!limit,
    }
  );

  return { artistAlbumsData: data, artistAlbumsError: error, artistAlbumsIsLoading: isLoading };
}
