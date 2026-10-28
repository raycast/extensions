import { RequestInit } from "node-fetch";
import { fetchPromise } from "../utils/fetcher";
import {
  CreateReclaimTaskRequest,
  ReclaimTask,
  reclaimTaskApiId,
  UpdateReclaimTaskRequest,
} from "../types/reclaim-task";
import useApi from "./useApi";

// Reclaim 2.0 ("Assistant") task hooks. These hit the /reclaim-tasks (GTD task
// pool) endpoints, used when user.features.assistant.enabled is true. The 1.0
// equivalents live in useTask.tsx.

export const useReclaimTasks = () => {
  const { data: tasks, error, isLoading } = useApi<ReclaimTask[]>("/reclaim-tasks");

  return {
    tasks,
    isLoading,
    error,
  };
};

export const useReclaimTaskActions = () => {
  const executeTaskAction = async <T,>(url: string, options?: RequestInit, payload?: unknown): Promise<T> => {
    const [response, error] = await fetchPromise<T>(url, { init: options, payload });
    if (error) throw error;
    if (!response) throw new Error("No response");
    return response;
  };

  const createTask = async (task: CreateReclaimTaskRequest) => {
    return await executeTaskAction<ReclaimTask>("/reclaim-tasks", { method: "POST" }, task);
  };

  const updateTask = async (id: string, payload: UpdateReclaimTaskRequest) => {
    return await executeTaskAction<ReclaimTask>(`/reclaim-tasks/${reclaimTaskApiId(id)}`, { method: "PATCH" }, payload);
  };

  const doneTask = async (task: ReclaimTask) => {
    return await updateTask(task.id, { completed: true });
  };

  const incompleteTask = async (task: ReclaimTask) => {
    return await updateTask(task.id, { completed: false });
  };

  return {
    createTask,
    updateTask,
    doneTask,
    incompleteTask,
  };
};
