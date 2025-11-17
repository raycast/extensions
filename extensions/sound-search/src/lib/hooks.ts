import { useState, useEffect } from "react";
import { getPlaybackManager } from "./audio";
import { getAllFavIds, getAllRecentIds, getAllFavoriteSamples, getAllRecentSamples } from "./file";
import { useCachedPromise } from "@raycast/utils";

/**
 * React hook to track playback state for a specific sample
 * @param sampleId The sample ID to track
 * @returns Whether the sample is currently playing
 */
export function usePlaybackState(sampleId: string): boolean {
  const [isPlaying, setIsPlaying] = useState(false);
  const manager = getPlaybackManager();

  useEffect(() => {
    // Initialize with current state
    setIsPlaying(manager.getCurrentSampleId() === sampleId);

    // Subscribe to state changes
    const unsubscribe = manager.subscribe((playingSampleId) => {
      setIsPlaying(playingSampleId === sampleId);
    });

    return unsubscribe;
  }, [sampleId]);

  return isPlaying;
}

export function useFavoritesRecents() {
  const { data: favoriteSampleIds = [], mutate: mutateFavorites } = useCachedPromise(getAllFavIds);
  const { data: recentSampleIds = [], mutate: mutateRecents } = useCachedPromise(getAllRecentIds);
  const { data: favoriteSamples = [], mutate: mutateFavoriteSamples } = useCachedPromise(getAllFavoriteSamples);
  const { data: recentSamples = [], mutate: mutateRecentSamples } = useCachedPromise(getAllRecentSamples);

  const mutateAll = async () => {
    await mutateFavorites();
    await mutateRecents();
    await mutateFavoriteSamples();
    await mutateRecentSamples();
  };

  return {
    favoriteSampleIds,
    recentSampleIds,
    favoriteSamples,
    recentSamples,
    mutateFavorites,
    mutateRecents,
    mutateAll,
  };
}
