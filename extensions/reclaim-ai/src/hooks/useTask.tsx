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

  const getAllTasks = async () => {
    try {
      const [tasks, error] = await axiosPromiseData<ApiResponseTasks>(fetcher("/tasks"));
      if (!tasks && error) throw error;
      return tasks;
    } catch (error) {
      console.error("Error while fetching tasks", error);
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
  const updateTask = async (task: Task) => {
    try {
      const [updatedTask, error] = await axiosPromiseData(
        fetcher(`/tasks/${task.id}`, {
          method: "PUT",
          responseType: "json",
          data: task,
        })
      );

      if (!updatedTask || error) throw error;
      return updatedTask;
    } catch (error) {
      console.error("Error while updating task", error);
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
    createTask,
    handleStartTask,
    handleStopTask,
    getAllTasks,
    addTime,
    updateTask,
    doneTask,
    incompleteTask,
  };
};

export { useTask };
