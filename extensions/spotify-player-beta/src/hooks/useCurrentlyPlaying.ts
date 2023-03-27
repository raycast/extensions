import { useCachedPromise } from "@raycast/utils";
import { getCurrentlyPlaying } from "../api/getCurrentlyPlaying";

export function useCurrentlyPlaying() {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getCurrentlyPlaying());

  return {
    currentPlayingData: data,
    currentPlayingError: error,
    currentPlayingIsLoading: isLoading,
    currentPlayingRevalidate: revalidate,
  };
}
