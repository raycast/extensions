import { useCachedPromise } from "@raycast/utils";
import { getTask, Task } from "../api/tasks";

export function useTaskDetail(task: Task) {
  return useCachedPromise((taskId) => getTask(taskId), [task.gid], { initialData: task });
}
