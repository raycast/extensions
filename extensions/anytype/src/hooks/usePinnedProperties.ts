import { useCachedPromise } from "@raycast/utils";
import { getProperty } from "../api";
import { errorConnectionMessage, ErrorWithStatus, getPinned, removePinned } from "../utils";

export function usePinnedProperties(key: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    async (key: string) => {
      const pinnedProperties = await getPinned(key);
      const properties = await Promise.all(
        pinnedProperties.map(async (pinned) => {
          try {
            const response = await getProperty(pinned.spaceId, pinned.objectId);
            // TODO: enable this when the API supports it
            // if (response.property?.archived) {
            //   await removePinned(pinned.spaceId, pinned.objectId, key);
            //   return null;
            // }
            return response.property;
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
      return properties.filter((property) => property !== null);
    },
    [key],
    {
      keepPreviousData: true,
    },
  );

  return {
    pinnedProperties: data,
    pinnedPropertiesError: error,
    isLoadingPinnedProperties: isLoading,
    mutatePinnedProperties: mutate,
  };
}
