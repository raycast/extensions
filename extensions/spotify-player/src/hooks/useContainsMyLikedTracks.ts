import { useCachedPromise } from "@raycast/utils";
import { containsMySavedTracks } from "../api/containsMySavedTrack";

type UseContainsMyLikedTracksProps = {
  trackIds: string[];
  options?: {
    execute?: boolean;
  };
};

export function useContainsMyLikedTracks({ trackIds, options }: UseContainsMyLikedTracksProps) {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    (trackIds: string[]) => containsMySavedTracks({ trackIds }),
    [trackIds],
    {
      execute: options?.execute !== false && trackIds.length > 0,
    },
  );

  return {
    containsMySavedTracksData: data,
    containsMySavedTracksError: error,
    containsMySavedTracksIsLoading: isLoading,
    containsMySavedTracksRevalidate: revalidate,
  };
}
