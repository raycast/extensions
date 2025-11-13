import { useMemo } from "react";
import { usePromise } from "@raycast/utils";
import { ClickUpClient } from "../utils/clickUpClient";
import { AxiosError } from "axios";
import type { TasksResponse } from "../types/tasks.dt";

interface UseSearchTasksOptions {
  teamId: string;
  searchQuery: string;
  includeClosed?: boolean;
  includeSubtasks?: boolean;
}

export function useSearchTasks({
  teamId,
  searchQuery,
  includeClosed = false,
  includeSubtasks = true,
}: UseSearchTasksOptions) {
  const endpoint = useMemo(() => {
    if (!teamId || !searchQuery.trim()) {
      return null;
    }

    const params = new URLSearchParams();
    params.append("search", searchQuery.trim());

    if (includeClosed) {
      params.append("include_closed", "true");
    }

    if (includeSubtasks) {
      params.append("subtasks", "true");
    }

    return `/team/${teamId}/task?${params.toString()}`;
  }, [teamId, searchQuery, includeClosed, includeSubtasks]);

  type ErrorResult = {
    err: string;
    ECODE: string;
  };

  const { isLoading, data, revalidate } = usePromise(
    async (endpoint: string | null) => {
      if (!endpoint) {
        return { tasks: [] } as TasksResponse;
      }

      try {
        const response = await ClickUpClient<TasksResponse>(endpoint, "GET", undefined, undefined, 2);
        return response.data;
      } catch (error) {
        const result = error as AxiosError<ErrorResult>;
        if (result.response?.data) {
          throw new Error(`${result.response.data.err} (${result.response.data.ECODE})`);
        }
        throw new Error("Failed to search tasks");
      }
    },
    [endpoint],
    {
      execute: endpoint !== null,
      failureToastOptions: {
        title: "Search Error",
      },
    },
  );

  return {
    isLoading,
    tasks: data?.tasks ?? [],
    revalidate,
  };
}
