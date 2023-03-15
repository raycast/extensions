import { useFetch } from "@raycast/utils";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { TaskObject } from "../types/task";

const include = JSON.stringify(["Lists", "ParentTasks"]);

const endpoint = (taskId: string) => `${ApiUrls.tasks}/${taskId}?include=${include}`;

export default function useTask(taskId: string, options?: Parameters<typeof useFetch<TaskObject>>[1]) {
  const { data, error, isLoading, mutate, revalidate } = useFetch<TaskObject>(endpoint(taskId), {
    headers: ApiHeaders,
    ...options,
  });

  return {
    task: data,
    taskError: error,
    taskIsLoading: isLoading,
    taskMutate: mutate,
    taskRevalidate: revalidate,
  };
}
