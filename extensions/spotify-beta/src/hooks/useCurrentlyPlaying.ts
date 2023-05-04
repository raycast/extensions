import { useCachedPromise } from "@raycast/utils";
import { getCurrentlyPlaying } from "../api/getCurrentlyPlaying";

type UseCurrentlyPlayingProps = {
  options?: {
    execute?: boolean;
  };
};

export function useCurrentlyPlaying({ options }: UseCurrentlyPlayingProps = {}) {
  const { data, error, isLoading, mutate } = useCachedPromise(() => getCurrentlyPlaying(), [], {
    execute: options?.execute !== false,
  });


  return {
    currentlyPlayingData: data,
    currentlyPlayingError: error,
    currentlyPlayingIsLoading: isLoading,
    currentlyPlayingRevalidate: mutate,
  };
}
