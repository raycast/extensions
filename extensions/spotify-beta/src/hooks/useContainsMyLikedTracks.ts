import { useCachedPromise } from "@raycast/utils";
import { containsMySavedTracks } from "../api/containsMySavedTrack";

type UseContainsMyLikedTracksProps = {
  trackIds: string[];
  options?: {
    execute?: boolean;
  };
};

export function useContainsMyLikedTracks({ trackIds, options }: UseContainsMyLikedTracksProps) {
  const { data, error, isLoading } = useCachedPromise(() => containsMySavedTracks({ trackIds }), [], {
    execute: options?.execute !== false,
  });

  return {
    containsMySavedTracksData: data,
    containsMySavedTracksError: error,
    containsMySavedTracksIsLoading: isLoading,
  };
}
