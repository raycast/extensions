import { Task } from "../types/task";
import { axiosPromiseData } from "../utils/axiosPromise";
import reclaimApi from "./useApi";
import { ApiResponseTasks, CreateTaskProps } from "./useTask.types";

const useTask = () => {
  const { fetcher } = reclaimApi();

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
        alwaysPrivate: true,
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

  const fetchTasks = async () => {
    try {
      const [tasks, error] = await axiosPromiseData<ApiResponseTasks>(fetcher("/tasks"));
      if (!tasks && error) throw error;
      return tasks;
    } catch (error) {
      console.error("Error while fetching tasks", error);
    }
  };

  // Get all tasks from the API
  const getAllTasks = async () => {
    try {
      const [GetTasks, error] = await axiosPromiseData<Task>(fetcher("/tasks", {method: "GET"}));//<Task[]>(fetcher("/tasks"));
      if (!GetTasks && error) throw error;
      return GetTasks;
    } catch (error) {
      console.error("Error while fetching tasks", error);
    }
  };
  
    return {
    createTask,
    fetchTasks,
    handleStartTask,
    handleStopTask,
    getAllTasks,
  };
};

export { useTask };
