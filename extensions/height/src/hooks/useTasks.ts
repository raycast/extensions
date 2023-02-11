import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { TaskObject } from "../types/task";
import { ApiResponse } from "../types/utils";

export default function useTasks() {
  const { data, error, isLoading, mutate } = useFetch<ApiResponse<TaskObject>>(ApiUrls.tasks + "?filters={}", {
    headers: ApiHeaders,
  });

  const { tasks } = useMemo(() => {
    const tasks = data?.list?.filter((task) => !task.deleted);

    return { tasks };
  }, [data]);

  return {
    tasksData: data?.list,
    tasks,
    tasksError: error,
    tasksIsLoading: isLoading,
    tasksMutate: mutate,
  };
}
