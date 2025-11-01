import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { getPlaybackState } from "../api/getPlaybackState";

export function usePlaybackState() {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getPlaybackState(), [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      revalidate();
    }, 5000);

    return () => clearInterval(interval);
  }, [revalidate]);

  return {
    playbackStateData: data,
    playbackStateError: error,
    playbackStateIsLoading: isLoading,
    playbackStateRevalidate: revalidate,
  };
}
