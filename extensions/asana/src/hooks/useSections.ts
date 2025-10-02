import { useCachedPromise } from "@raycast/utils";
import { getSections } from "../api/projects";

export function useSections(projectId?: string) {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async (projectId: string) => {
      return await getSections(projectId);
    },
    [projectId],
    {
      execute: !!projectId,
    },
  );

  return {
    data,
    error,
    isLoading,
    revalidate,
  };
}
