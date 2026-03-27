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

const searchTasks = async (workspaceId: string, search: string): Promise<TaskRecord[]> => {
  const data = await graphqlRequest<SearchTasksQueryData>(SEARCH_TASKS_QUERY, {
    after: null,
    first: 50,
    search,
    workspaceId,
  });

  return data.tasks.nodes;
};

const searchTasksAll = async (workspaceIds: string[], search: string): Promise<TaskRecord[]> => {
  const data = await graphqlRequest<SearchTasksQueryData>(SEARCH_TASKS_ALL_QUERY, {
    after: null,
    first: 50,
    search,
    workspaceIds,
  });

  return data.tasks.nodes;
};

export const useSearchTasks = (workspaceId: string | null, searchText: string, allWorkspaceIds?: string[]) => {
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

  return { error, isLoading, revalidate, tasks: data || [] };
};
