import { useCachedPromise } from "@raycast/utils";
import { getProperty } from "../api";

export function useProperty(spaceId: string, propertyId: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    async (spaceId: string, propertyId: string) => {
      const response = await getProperty(spaceId, propertyId);
      return response.property;
    },
    [spaceId, propertyId],
    {
      keepPreviousData: true,
      execute: !!spaceId && !!propertyId,
    },
  );

  return {
    property: data,
    propertyError: error,
    isLoadingProperty: isLoading,
    mutateProperty: mutate,
  };
}
