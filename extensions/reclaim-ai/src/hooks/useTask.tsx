import { showHUD } from "@raycast/api";
import { RequestInit } from "node-fetch";
import { Task } from "../types/task";
import useApi from "./useApi";
import { CreateTaskProps, PlannerActionIntermediateResult } from "./useTask.types";
import { fetchPromise } from "../utils/fetcher";

export const useTasks = () => {
  const { data: tasks, error, isLoading } = useApi<Task[]>("/tasks?instances=true");

  return {
    tasks,
    isLoading,
    error,
  };
};

export const useTaskActions = () => {
  const executeTaskAction = async <T,>(url: string, options?: RequestInit, payload?: unknown): Promise<T> => {
    const [response, error] = await fetchPromise<T>(url, { init: options, payload });
    if (error) throw error;
    if (!response) throw new Error("No response");
    return response;
  };

  const createTask = async (task: CreateTaskProps) => {
    const data = {
      eventCategory: task.category,
      timeSchemeId: task.timePolicy,
      title: task.title,
      timeChunksRequired: task.timeNeeded,
      snoozeUntil: task.snoozeUntil,
      due: task.due,
      minChunkSize: task.durationMin,
      maxChunkSize: task.durationMax,
      notes: task.notes,
      alwaysPrivate: task.alwaysPrivate,
      priority: task.priority,
      onDeck: task.onDeck,
    };

    return await executeTaskAction<Task>("/tasks", { method: "POST" }, data);
  };

  const startTask = async (id: string) => {
    const response = await executeTaskAction<PlannerActionIntermediateResult>(`/planner/start/task/${id}`, {
      method: "POST",
    });
    await showHUD("Started Task");
    return response;
  };

  const restartTask = async (id: string) => {
    const response = await executeTaskAction<PlannerActionIntermediateResult>(`/planner/restart/task/${id}`, {
      method: "POST",
    });
    await showHUD("Restarted Task");
    return response;
  };

  const stopTask = async (id: string) => {
    const response = await executeTaskAction<PlannerActionIntermediateResult>(`/planner/stop/task/${id}`, {
      method: "POST",
    });
    await showHUD("Stopped Task");
    return response;
  };

  // Add time
  const addTime = async (task: Task, time: number) => {
    return await executeTaskAction<PlannerActionIntermediateResult>(
      `/planner/add-time/task/${task.id}?minutes=${time}`,
      { method: "POST" }
    );
  };

  // Update task
  const updateTask = async (task: Partial<Task>, payload: Partial<Task>) => {
    return await executeTaskAction<Task>(`/tasks/${task.id}`, { method: "PATCH" }, payload);
  };

  // Set task to done
  const doneTask = async (task: Task) => {
    return await executeTaskAction<PlannerActionIntermediateResult>(`/planner/done/task/${task.id}`, {
      method: "POST",
    });
  };

  // Set task to incomplete
  const incompleteTask = async (task: Task) => {
    return await executeTaskAction<PlannerActionIntermediateResult>(`/planner/unarchive/task/${task.id}`, {
      method: "POST",
    });
  };

  // Snooze Task
  const rescheduleTask = async (taskId: string, rescheduleCommand: string, relativeFrom?: string) => {
    return await executeTaskAction<PlannerActionIntermediateResult>(
      `/planner/task/${taskId}/snooze?snoozeOption=${rescheduleCommand}&relativeFrom=${
        relativeFrom ? relativeFrom : null
      }`,
      { method: "POST" }
    );
  };

  return {
    createTask,
    startTask,
    restartTask,
    stopTask,
    addTime,
    updateTask,
    doneTask,
    incompleteTask,
    rescheduleTask,
  };
};
