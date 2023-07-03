import { useCachedPromise } from "@raycast/utils";
import { getCurrentlyPlayingUri } from "../api/getCurrentlyPlayingUri";

type UseCurrentlyPlayingUriProps = {
  options?: {
    execute?: boolean;
  };
};

export function useCurrentlyPlayingUri({ options }: UseCurrentlyPlayingUriProps = {}) {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getCurrentlyPlayingUri(), [], {
    execute: options?.execute !== false,
  });

  return {
    currentlyPlayingUriData: data,
    currentlyPlayingUriError: error,
    currentlyPlayingUriIsLoading: isLoading,
    currentlyPlayingUriRevalidate: revalidate,
  };
}
