import { useCachedPromise } from "@raycast/utils";
import { getArtistTopTracks } from "../api/getArtistTopTracks.ts";

type UseArtistTopTracksProps = {
  artistId?: string;
  options?: {
    execute?: boolean;
  };
};

export function useArtistTopTracks({ artistId = "", options }: UseArtistTopTracksProps) {
  const { data, error, isLoading } = useCachedPromise(
    (artistId: string) => getArtistTopTracks({ artistId }),
    [artistId],
    {
      execute: options?.execute !== false && !!artistId,
    },
  );

  return { artistTopTracksData: data, artistTopTracksError: error, artistTopTracksIsLoading: isLoading };
}
