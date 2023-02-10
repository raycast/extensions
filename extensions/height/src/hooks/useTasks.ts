import { useFetch } from "@raycast/utils";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { TaskObject } from "../types/task";
import { ApiResponse } from "../types/utils";

export default function useTasks() {
  const { data, error, isLoading, mutate } = useFetch<ApiResponse<TaskObject>>(ApiUrls.tasks, {
    headers: ApiHeaders,
  });

  return {
    tasksData: data?.list,
    tasksError: error,
    tasksIsLoading: isLoading,
    tasksMutate: mutate,
  };
}
