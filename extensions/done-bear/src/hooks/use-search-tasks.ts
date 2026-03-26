import { useCachedPromise } from "@raycast/utils";
import { graphqlRequest } from "../api/client";
import { SEARCH_TASKS_ALL_QUERY, SEARCH_TASKS_QUERY } from "../api/queries";
import type { TaskRecord } from "../api/types";
import { ALL_WORKSPACES_ID, resolveAllScope } from "./use-workspaces";

interface SearchTasksQueryData {
  tasks: {
    nodes: TaskRecord[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

async function searchTasks(workspaceId: string, search: string): Promise<TaskRecord[]> {
  const data = await graphqlRequest<SearchTasksQueryData>(SEARCH_TASKS_QUERY, {
    first: 50,
    after: null,
    workspaceId,
    search,
  });

  return data.tasks.nodes;
}

async function searchTasksAll(workspaceIds: string[], search: string): Promise<TaskRecord[]> {
  const data = await graphqlRequest<SearchTasksQueryData>(SEARCH_TASKS_ALL_QUERY, {
    first: 50,
    after: null,
    workspaceIds,
    search,
  });

  return data.tasks.nodes;
}

export function useSearchTasks(workspaceId: string | null, searchText: string, allWorkspaceIds?: string[]) {
  const { isAll, cacheKey } = resolveAllScope(workspaceId, allWorkspaceIds);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (key: string, query: string) => {
      if (isAll) {
        return searchTasksAll(allWorkspaceIds ?? [], query);
      }
      return searchTasks(key, query);
    },
    [cacheKey, searchText],
    {
      execute: !!workspaceId && searchText.length > 0 && (isAll || workspaceId !== ALL_WORKSPACES_ID),
    },
  );

  return { tasks: data || [], isLoading, error, revalidate };
}
