import type { Task } from "../types/task.dt";
import useClickUp from "./useClickUp";

function useTaskDetails(taskId: string) {
  const { isLoading, data } = useClickUp<Task>(`/task/${taskId}/?include_subtasks=true`);
  return { isLoading, task: data };
}

export { useTaskDetails };
