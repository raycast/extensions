import { useCachedPromise } from "@raycast/utils";
import { getObject } from "../api/getObject";

export function useObject(spaceId: string, objectId: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    async (spaceId: string, objectId: string) => {
      const response = await getObject(spaceId, objectId);
      return response.object;
    },
    [spaceId, objectId],
    {
      keepPreviousData: true,
    },
  );

  return {
    object: data,
    objectError: error,
    isLoadingObject: isLoading,
    mutateObject: mutate,
  };
}
