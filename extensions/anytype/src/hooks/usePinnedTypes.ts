import { useCachedPromise } from "@raycast/utils";
import { getType } from "../api";
import { Type } from "../models";
import { errorConnectionMessage, ErrorWithStatus, getPinned, removePinned } from "../utils";

export function usePinnedTypes(key: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    async (key: string) => {
      const pinnedTypes = await getPinned(key);
      const types: Type[] = [];

      for (const pinned of pinnedTypes) {
        try {
          const response = await getType(pinned.spaceId, pinned.objectId);
          if (response.type.archived) {
            await removePinned(pinned.spaceId, pinned.objectId, key);
          } else {
            types.push(response.type);
          }
        } catch (error) {
          const typedError = error as ErrorWithStatus;
          if (typedError.message === errorConnectionMessage) {
            throw error;
          } else if (typedError.status === 404 || typedError.status === 410) {
            await removePinned(pinned.spaceId, pinned.objectId, key);
          }
        }
      }

      return types;
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
