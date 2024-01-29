import { useCachedPromise } from "@raycast/utils";
import { getCurrentlyPlaying } from "../api/getCurrentlyPlaying";

export function useAppleScriptCurrentlyPlayingId() {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getCurrentlyPlaying());

  return {
    currentlyPlayingData: data,
    currentlyPlayingError: error,
    currentlyPlayingIsLoading: isLoading,
    currentlyPlayingRevalidate: revalidate,
  };
}
