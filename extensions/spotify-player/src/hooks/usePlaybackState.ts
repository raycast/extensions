import { useCachedPromise } from "@raycast/utils";
import { getPlaybackState } from "../api/getPlaybackState";

type UsePlaybackStateProps = {
  options?: {
    execute?: boolean;
  };
};

export function usePlaybackState({ options }: UsePlaybackStateProps = {}) {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getPlaybackState(), [], {
    execute: options?.execute !== false,
  });

  return {
    playbackStateData: data,
    playbackStateError: error,
    playbackStateIsLoading: isLoading,
    playbackStateRevalidate: revalidate,
  };
}
