import { useCachedPromise } from "@raycast/utils";

import { searchProjects } from "../api/projects";

export function useProjects(searchText: string) {
  const { data, isLoading, pagination, revalidate } = useCachedPromise(
    (text: string) => async (options: { page: number; cursor?: string }) => {
      const result = await searchProjects({ searchText: text, after: options.cursor ?? null });
      return { data: result.projects, hasMore: result.hasMore, cursor: result.cursor ?? undefined };
    },
    [searchText],
    { keepPreviousData: true },
  );

  return {
    projects: data ?? [],
    isLoadingProjects: isLoading,
    pagination,
    revalidateProjects: revalidate,
  };
}
