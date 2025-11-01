import { useCachedPromise } from "@raycast/utils";
import { useEffect, useCallback } from "react";
import { getCurrentlyPlaying } from "../api/getCurrentlyPlaying";

export function useCurrentlyPlaying() {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getCurrentlyPlaying(), [], {
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
    currentlyPlayingData: data,
    currentlyPlayingError: error,
    currentlyPlayingIsLoading: isLoading,
    currentlyPlayingRevalidate: revalidate,
  };
}
