import { useCachedPromise } from "@raycast/utils";
import { getModules } from "../api/modules";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { inlineErrorHandler } from "../helpers/errors";

export function useModules(
  projectId: string,
  config: {
    execute?: boolean;
    /** The caller renders `error` (e.g. ErrorEmptyView), so no toast. Forms leave it off and keep the toast. */
    showsErrorInline?: boolean;
  },
) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (projectId: string) => (pagination: PaginationOptions) => getModules({ projectId, cursor: pagination.cursor }),
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
