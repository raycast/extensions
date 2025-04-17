import { useCachedPromise } from "@raycast/utils";
import { getObject } from "../api";

export function useObject(spaceId: string, objectId: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    async (spaceId: string, objectId: string) => {
      const response = await getObject(spaceId, objectId);
      return response.object;
    },
    [spaceId, objectId],
    {
      keepPreviousData: true,
      execute: !!spaceId && !!objectId,
    },
  );

  return {
    object: data,
    objectError: error,
    isLoadingObject: isLoading,
    mutateObject: mutate,
  };
}
