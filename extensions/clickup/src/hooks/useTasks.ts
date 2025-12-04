import type { TasksResponse } from "../types/tasks.dt";
import useClickUp from "./useClickUp";

function useTasks(listId: string) {
  const { isLoading, data } = useClickUp<TasksResponse>(`/list/${listId}/task?archived=false`);
  return { isLoading, tasks: data?.tasks ?? [] };
}

export { useTasks };
