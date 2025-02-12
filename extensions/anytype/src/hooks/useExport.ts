import { useCachedPromise } from "@raycast/utils";
import { getExport } from "../api/getExport";

export function useExport(spaceId: string, objectId: string, format: string) {
  const { data, error, mutate, isLoading } = useCachedPromise(
    async (spaceId, objectId, format) => {
      const response = await getExport(spaceId, objectId, format);
      return response;
    },
    [spaceId, objectId, format],
  );

  return {
    objectExport: data,
    objectExportError: error,
    isLoadingObjectExport: isLoading,
    mutateObjectExport: mutate,
  };
}
