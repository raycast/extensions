import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { getCurrentlyPlaying } from "../api/getCurrentlyPlaying";

export function useCurrentlyPlaying() {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getCurrentlyPlaying(), [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      revalidate();
    }, 5000);

    return () => clearInterval(interval);
  }, [revalidate]);

  return {
    currentlyPlayingData: data,
    currentlyPlayingError: error,
    currentlyPlayingIsLoading: isLoading,
    currentlyPlayingRevalidate: revalidate,
  };
}
