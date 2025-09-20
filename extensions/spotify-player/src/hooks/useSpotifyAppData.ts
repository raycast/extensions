import { useCachedPromise } from "@raycast/utils";
import { getSpotifyAppData } from "../api/getSpotifyAppData";

type UseSpotifyAppData = {
  options?: {
    execute?: boolean;
  };
};

export function useSpotifyAppData({ options }: UseSpotifyAppData = {}) {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getSpotifyAppData(), [], {
    execute: options?.execute !== false,
  });

  return {
    spotifyAppData: data,
    spotifyAppDataError: error,
    spotifyAppDataIsLoading: isLoading,
    spotifyAppDataRevalidate: revalidate,
  };
}
