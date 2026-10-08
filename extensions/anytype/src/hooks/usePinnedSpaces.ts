import { useCachedPromise } from "@raycast/utils";
import { getSpace } from "../api";
import { Space } from "../models";
import { errorConnectionMessage, ErrorWithStatus, getPinned, localStorageKeys, removePinned } from "../utils";

export function usePinnedSpaces() {
  const { data, error, isLoading, mutate } = useCachedPromise(
    async () => {
      const key = localStorageKeys.suffixForSpaces;
      const pinnedSpaces = await getPinned(key);
      const spaces: Space[] = [];

      for (const pinned of pinnedSpaces) {
        try {
          const { space } = await getSpace(pinned.spaceId);
          spaces.push(space);
        } catch (error) {
          const typedError = error as ErrorWithStatus;
          if (typedError.message === errorConnectionMessage) {
            throw error;
          } else if (typedError.status === 404 || typedError.status === 410) {
            await removePinned(pinned.spaceId, pinned.objectId, key);
          }
        }
      }

      return spaces;
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
