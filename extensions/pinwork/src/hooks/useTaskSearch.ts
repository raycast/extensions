/**
 * Hook to search tasks with abortable queries.
 */

import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { searchTasks } from "../api/pinwork";
import type { SearchScope } from "../api/types";

export function useTaskSearch(
  query: string,
  scope: SearchScope,
  options?: { execute?: boolean },
) {
  const abortable = useRef<AbortController | null>(null);
  const shouldExecute = (options?.execute ?? true) && Boolean(query.trim());

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (searchText: string, searchScope: SearchScope) =>
      searchTasks(searchText, searchScope, {
        signal: abortable.current?.signal,
      }),
    [query, scope],
    {
      initialData: [],
      execute: shouldExecute,
      abortable,
    },
  );

  return { tasks: data, isLoading, error, revalidate };
}
