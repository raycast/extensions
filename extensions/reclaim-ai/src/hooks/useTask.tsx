import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import { Task } from "../types/task";
import { axiosPromiseData } from "../utils/axiosPromise";
import reclaimApi from "./useApi";
import { CreateTaskProps } from "./useTask.types";

const useTask = () => {
  const { fetcher } = reclaimApi();

  const { apiUrl, apiToken } = getPreferenceValues<NativePreferences>();

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    [apiToken]
  );

  const useFetchTasks = () =>
    useFetch<[Task]>(`${apiUrl}/tasks?instances=true`, {
      headers,
      keepPreviousData: true,
    });

  const createTask = async (task: CreateTaskProps) => {
    try {
      const data = {
        eventCategory: "WORK",
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

      const [createdTask, error] = await axiosPromiseData<Task>(
        fetcher("/tasks", {
          method: "POST",
          data,
        })
      );
      if (!createTask && error) throw error;

      return createdTask;
    } catch (error) {
      console.error("Error while creating task", error);
    }
  };

  const handleStartTask = async (id: string) => {
    try {
      const [task, error] = await axiosPromiseData(fetcher(`/planner/start/task/${id}`, { method: "POST" }));
      if (!task || error) throw error;
      return task;
    } catch (error) {
      console.error("Error while starting task", error);
    }
  };

  const handleStopTask = async (id: string) => {
    try {
      const [task, error] = await axiosPromiseData(fetcher(`/planner/stop/task/${id}`, { method: "POST" }));
      if (!task || error) throw error;
      return task;
    } catch (error) {
      console.error("Error while stopping task", error);
    }
  };

  // Add time
  const addTime = async (task: Task, time: number) => {
    try {
      const [updatedTime, error] = await axiosPromiseData(
        fetcher(`/planner/add-time/task/${task.id}?minutes=${time}`, { method: "POST", responseType: "json" })
      );
      if (!updatedTime || error) throw error;
      return updatedTime;
    } catch (error) {
      console.error("Error while adding time", error);
    }
  };

  // Update task
  const updateTask = async (task: Partial<Task>, payload: Partial<Task>) => {
    try {
      const [updatedTask] = await axiosPromiseData(
        fetcher(`/tasks/${task.id}`, {
          method: "PATCH",
          responseType: "json",
          data: payload,
        })
      );
      return updatedTask;
    } catch (error) {
      console.error("Error while updating task", error);
      throw error;
    }
  };

  // Set task to done
  const doneTask = async (task: Task) => {
    try {
      const [updatedStatus, error] = await axiosPromiseData(
        fetcher(`/planner/done/task/${task.id}`, { method: "POST", responseType: "json" })
      );
      if (!updatedStatus || error) throw error;
      return updatedStatus;
    } catch (error) {
      console.error("Error while updating task", error);
    }
  };

  // Set task to incomplete
  const incompleteTask = async (task: Task) => {
    try {
      const [updatedStatus, error] = await axiosPromiseData(
        fetcher(`/planner/unarchive/task/${task.id}`, { method: "POST", responseType: "json" })
      );
      if (!updatedStatus || error) throw error;
      return updatedStatus;
    } catch (error) {
      console.error("Error while updating task", error);
    }
  };

  return {
    useFetchTasks,
    createTask,
    handleStartTask,
    handleStopTask,
    addTime,
    updateTask,
    doneTask,
    incompleteTask,
  };
};

export { useTask };
