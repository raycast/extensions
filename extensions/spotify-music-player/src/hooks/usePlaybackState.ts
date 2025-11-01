import { useCachedPromise } from "@raycast/utils";
import { useEffect, useCallback } from "react";
import { getPlaybackState } from "../api/getPlaybackState";

export function usePlaybackState() {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getPlaybackState(), [], {
    keepPreviousData: true,
  });

  const revalidateCallback = useCallback(() => {
    revalidate();
  }, [revalidate]);

  useEffect(() => {
    const interval = setInterval(revalidateCallback, 5000);

    return () => clearInterval(interval);
  }, [revalidateCallback]);

  return {
    playbackStateData: data,
    playbackStateError: error,
    playbackStateIsLoading: isLoading,
    playbackStateRevalidate: revalidate,
  };
}
