import { useCachedPromise } from "@raycast/utils";
import { getTask, Task } from "../api/tasks";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useTaskDetail(task: Task) {
  return useCachedPromise((taskId) => getTask(taskId), [task.gid], {
    initialData: task,
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
