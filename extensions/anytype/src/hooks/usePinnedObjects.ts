import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { getObject } from "../api";
import { Member, SpaceObject, Type } from "../models";
import { ErrorWithStatus, getPinned, removePinned } from "../utils";

export function usePinnedObjects(key: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    async (key) => {
      const pinnedObjects = await getPinned(key);
      const objects = await Promise.all(
        pinnedObjects.map(async (pinned) => {
          try {
            const response = await getObject(pinned.spaceId, pinned.objectId);
            if (response.object?.archived) {
              await removePinned(pinned.spaceId, pinned.objectId, key);
              return null;
            }
            return response.object;
          } catch (error) {
            const typedError = error as ErrorWithStatus;
            if (typedError.status === 404 || typedError.status === 410) {
              await removePinned(pinned.spaceId, pinned.objectId, key);
            }
            return null;
          }
        }),
      );
      return objects.filter((object) => object !== null);
    },
    [key],
    {
      keepPreviousData: true,
    },
  );

  return {
    pinnedObjects: data as SpaceObject[],
    pinnedObjectsError: error,
    isLoadingPinnedObjects: isLoading,
    mutatePinnedObjects: mutate as MutatePromise<SpaceObject[] | Type[] | Member[]>,
  };
}
