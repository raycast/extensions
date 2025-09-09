import { useState, useEffect } from "react";
import {
  getHighestPriorityTask,
  markTaskDone,
  deleteTask,
  updateTask,
  getAllUncompletedTasks,
} from "../utils/taskOperations";
import { Priority, Task } from "../types";
import { priorityToValue } from "../utils/priority";

export const useTasks = (preferences: Preferences) => {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [topTask, setTopTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const highestPriorityTask = await getHighestPriorityTask();
      setTopTask(highestPriorityTask);
      let tasks = await getAllUncompletedTasks();

      if (preferences.showOnlyCurrent) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        tasks = tasks.filter((task) => {
          const { dueDate, scheduledDate } = task;
          return (dueDate && dueDate < tomorrow) || (scheduledDate && scheduledDate < tomorrow);
        });
      }

      if (preferences.sortByPriority) {
        tasks.sort((a, b) => {
          const priorityA = a.priority || Priority.LOWEST;
          const priorityB = b.priority || Priority.LOWEST;

          if (!b.priority) return -1;
          return priorityToValue(priorityA) - priorityToValue(priorityB);
        });
      }

      setAllTasks(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTopTask(null);
      setAllTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTaskList = async () => {
    setAllTasks(await getAllUncompletedTasks());
    setTopTask(await getHighestPriorityTask());
  };

  const handleMarkDone = async (task: Task | null) => {
    if (!task) return;
    await markTaskDone(task);
    setTopTask(null);
    refreshTaskList();
  };

  const handleDeleteTask = async (task: Task) => {
    await deleteTask(task);
    refreshTaskList();
  };

  const handleSetPriority = async (task: Task, priority: Priority) => {
    await updateTask({ ...task, priority });
    refreshTaskList();
  };

  useEffect(() => {
    fetchTasks();

    const refreshIntervalInMinutes = parseInt(preferences.refreshIntervalInMinutes) || 1;
    const interval = setInterval(fetchTasks, refreshIntervalInMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    allTasks,
    topTask,
    isLoading,
    refreshTaskList,
    handleMarkDone,
    handleDeleteTask,
    handleSetPriority,
  };
};
