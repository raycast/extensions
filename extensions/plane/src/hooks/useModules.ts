import { useCachedPromise } from "@raycast/utils";
import { getModules } from "../api/modules";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { inlineErrorHandler } from "../helpers/errors";
import { tagWithProject } from "../helpers/project-scoped";

export function useModules(
  projectId: string,
  config: {
    execute?: boolean;
    /** The caller renders `error` (e.g. ErrorEmptyView), so no toast. Forms leave it off and keep the toast. */
    showsErrorInline?: boolean;
  },
) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (projectId: string) => async (pagination: PaginationOptions) => {
      const page = await getModules({ projectId, cursor: pagination.cursor });
      return { ...page, data: tagWithProject(page.data, projectId) };
    },
    [projectId],
    {
      initialData: [],
      keepPreviousData: true,
      onError: inlineErrorHandler(config.showsErrorInline),
      execute: config.execute !== false,
    },
  );

  return {
    modules: data,
    error,
    isLoading,
    mutate,
    pagination,
  };
}
