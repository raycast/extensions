import { useCachedPromise } from "@raycast/utils";
import { getType } from "../api";
import { ErrorWithStatus, getPinned, removePinned } from "../utils";

export function usePinnedTypes(key: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    async (key: string) => {
      const pinnedTypes = await getPinned(key);
      const types = await Promise.all(
        pinnedTypes.map(async (pinned) => {
          try {
            const response = await getType(pinned.spaceId, pinned.objectId);
            if (response.type?.archived) {
              await removePinned(pinned.spaceId, pinned.objectId, key);
              return null;
            }
            return response.type;
          } catch (error) {
            const typedError = error as ErrorWithStatus;
            if (typedError.status === 404 || typedError.status === 410) {
              await removePinned(pinned.spaceId, pinned.objectId, key);
            }
            return null;
          }
        }),
      );
      return types.filter((type) => type !== null);
    },
    [key],
    {
      keepPreviousData: true,
    },
  );

  return {
    pinnedTypes: data,
    pinnedTypesError: error,
    isLoadingPinnedTypes: isLoading,
    mutatePinnedTypes: mutate,
  };
}
