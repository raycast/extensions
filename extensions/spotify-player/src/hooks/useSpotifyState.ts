import { useCachedPromise } from "@raycast/utils";
import { getSpotifyAppData } from "../api/getSpotifyState";

type UseSpotifyState = {
  options?: {
    execute?: boolean;
  };
};

export function useSpotifyState({ options }: UseSpotifyState = {}) {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getSpotifyAppData(), [], {
    execute: options?.execute !== false,
  });

  return {
    spotifyState: data,
    spotifyStateError: error,
    spotifyStateIsLoading: isLoading,
    spotifyStateRevalidate: revalidate,
  };
}
