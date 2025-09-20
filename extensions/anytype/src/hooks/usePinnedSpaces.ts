import { useCachedPromise } from "@raycast/utils";
import { getSpace } from "../api";
import { errorConnectionMessage, ErrorWithStatus, getPinned, localStorageKeys, removePinned } from "../utils";

export function usePinnedSpaces() {
  const { data, error, isLoading, mutate } = useCachedPromise(
    async () => {
      const key = localStorageKeys.suffixForSpaces;
      const pinnedSpaces = await getPinned(key);
      const spaces = await Promise.all(
        pinnedSpaces.map(async (pinned) => {
          try {
            const response = await getSpace(pinned.spaceId);
            return response.space;
          } catch (error) {
            const typedError = error as ErrorWithStatus;
            if (typedError.message === errorConnectionMessage) {
              throw error;
            } else if (typedError.status === 404 || typedError.status === 410) {
              await removePinned(pinned.spaceId, pinned.objectId, key);
            }
            return null;
          }
        }),
      );
      return spaces.filter((space) => space !== null);
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  return {
    pinnedSpaces: data,
    pinnedSpacesError: error,
    isLoadingPinnedSpaces: isLoading,
    mutatePinnedSpaces: mutate,
  };
}
