import { useCachedPromise } from "@raycast/utils";
import { getCurrentPlayingTrack } from "../api/getCurrentPlayingTrack";

export function useCurrentPlayingTrack() {
  const { data, error, isLoading } = useCachedPromise(() => getCurrentPlayingTrack());

  return {
    currentPlayingData: data,
    currentPlayingError: error,
    currentPlayingIsLoading: isLoading,
  };
}
