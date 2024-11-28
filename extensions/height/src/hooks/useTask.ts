import { useCachedPromise } from "@raycast/utils";

import { ApiUrls } from "@/api/helpers";
import { getOneTask } from "@/api/task";
import { CachedPromiseOptionsType } from "@/types/utils";

type Props = {
  taskId: string;
  options?: CachedPromiseOptionsType<Awaited<ReturnType<typeof getOneTask>>>;
};

const include = JSON.stringify(["Lists", "ParentTasks"]);

const endpoint = (taskId: Props["taskId"]) => `${ApiUrls.tasks}/${taskId}?include=${include}`;

export default function useTask({ taskId, options }: Props) {
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    (taskId) => getOneTask(endpoint(taskId)),
    [taskId],
    {
      ...options,
    },
  );

  return {
    task: data,
    taskError: error,
    taskIsLoading: isLoading,
    taskMutate: mutate,
    taskRevalidate: revalidate,
  };
}
