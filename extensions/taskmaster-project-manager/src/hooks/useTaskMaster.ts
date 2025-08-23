/**
 * TaskMaster React Hooks - Enhanced with proper error handling and loading states
 */

import { useCachedPromise } from "@raycast/utils";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { readTasks, getNextTask } from "../lib/utils";
import { GetTasksOptions } from "../types/task";
import { useCallback } from "react";

/**
 * Hook for fetching tasks with enhanced error handling and loading states
 */
export function useTasks(options: GetTasksOptions = {}) {
  const { projectRoot = "" } = options;

  const handleError = useCallback(async (error: Error) => {
    console.error("Task loading error:", error);

    // Show user-friendly error toast
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load Tasks",
      message: error.message,
    });
  }, []);

  const result = useCachedPromise(
    async (projectPath: string) => {
      try {
        if (!projectPath || projectPath.trim() === "") {
          throw new Error(
            "Project root not configured. Please set the project root path in Raycast preferences.",
          );
        }

        console.log(`Attempting to read tasks from: ${projectPath}`);
        const taskData = await readTasks(projectPath);
        let tasks = taskData.tasks;

        // Apply status filter if specified
        if (options.status) {
          tasks = tasks.filter((task) => task.status === options.status);
        }

        console.log(`Successfully loaded ${tasks.length} tasks`);
        return tasks;
      } catch (error) {
        // Handle error gracefully without breaking UI
        await handleError(
          error instanceof Error ? error : new Error(String(error)),
        );
        return []; // Return empty array to prevent UI breaks
      }
    },
    [projectRoot],
    {
      keepPreviousData: true,
      initialData: [],
      onError: handleError,
    },
  );

  return {
    ...result,
    // Enhanced error state that doesn't break UI
    error: result.error ? null : undefined, // Suppress error since we handle it gracefully
  };
}

/**
 * Hook for getting the next available task with enhanced error handling
 */
export function useNextTask(projectRoot: string) {
  const handleError = useCallback(async (error: Error) => {
    console.error("Next task loading error:", error);

    // Show user-friendly error toast
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load Next Task",
      message: error.message,
    });
  }, []);

  const result = useCachedPromise(
    async (projectPath: string) => {
      try {
        if (!projectPath || projectPath.trim() === "") {
          throw new Error(
            "Project root not configured. Please set the project root path in Raycast preferences.",
          );
        }

        console.log(`Getting next task from: ${projectPath}`);
        const taskData = await readTasks(projectPath);
        return getNextTask(taskData.tasks);
      } catch (error) {
        // Handle error gracefully
        await handleError(
          error instanceof Error ? error : new Error(String(error)),
        );
        return null; // Return null to indicate no task available
      }
    },
    [projectRoot],
    {
      keepPreviousData: true,
      initialData: null,
      onError: handleError,
    },
  );

  return {
    ...result,
    // Enhanced error state that doesn't break UI
    error: result.error ? null : undefined, // Suppress error since we handle it gracefully
  };
}

/**
 * Combined hook for TaskMaster data with enhanced error handling - used by AI Assistant
 */
export function useTaskMaster(projectRoot?: string) {
  const preferences = getPreferenceValues();
  const root = projectRoot || preferences.projectRoot || "";

  const handleError = useCallback(async (error: Error) => {
    console.error("TaskMaster data loading error:", error);

    // Show user-friendly error toast
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load TaskMaster Data",
      message: error.message,
    });
  }, []);

  const tasksResult = useCachedPromise(
    async (projectPath: string) => {
      try {
        if (!projectPath || projectPath.trim() === "") {
          throw new Error(
            "Project root not configured. Please set the project root path in Raycast preferences.",
          );
        }

        console.log(`Loading all TaskMaster data from: ${projectPath}`);
        const taskData = await readTasks(projectPath);
        return taskData.tasks;
      } catch (error) {
        // Handle error gracefully
        await handleError(
          error instanceof Error ? error : new Error(String(error)),
        );
        return []; // Return empty array to prevent UI breaks
      }
    },
    [root],
    {
      keepPreviousData: true,
      initialData: [],
      onError: handleError,
    },
  );

  return {
    tasks: tasksResult.data,
    allTasks: tasksResult.data,
    isLoading: tasksResult.isLoading,
    error: tasksResult.error ? null : undefined, // Suppress error since we handle it gracefully
    revalidate: tasksResult.revalidate,
  };
}
