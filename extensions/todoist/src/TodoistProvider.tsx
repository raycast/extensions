import React from "react";
import { mutate } from "swr";
import { confirmAlert, showToast, ToastStyle } from "@raycast/api";
import { Task, UpdateTaskArgs } from "@doist/todoist-api-typescript";
import { SWRKeys } from "./types";
import { todoist, handleError } from "./api";

interface TodoistContextProps {
  completeTask: (task: Task) => void;
  deleteTask: (task: Task) => void;
  updateTask: (task: Task, payload: UpdateTaskArgs) => void;
}

interface TodoistProviderProps {
  children: React.ReactNode;
}

export function TodoistProvider({ children }: TodoistProviderProps): JSX.Element {
  async function completeTask(task: Task) {
    await showToast(ToastStyle.Animated, "Completing task");

    try {
      await todoist.closeTask(task.id);
      await showToast(ToastStyle.Success, "Task updated");
      mutate(SWRKeys.tasks);
    } catch (error) {
      handleError({ error, title: "Unable to complete task" });
    }
  }

  async function deleteTask(task: Task) {
    if (await confirmAlert({ title: "Are you sure you want to delete this task?" })) {
      await showToast(ToastStyle.Animated, "Deleting task");

      try {
        await todoist.deleteTask(task.id);
        await showToast(ToastStyle.Success, "Task deleted");
        mutate(SWRKeys.tasks);
      } catch (error) {
        handleError({ error, title: "Unable to delete task" });
      }
    }
  }

  async function updateTask(task: Task, payload: UpdateTaskArgs) {
    await showToast(ToastStyle.Animated, "Updating task");

    try {
      await todoist.updateTask(task.id, payload);
      await showToast(ToastStyle.Success, "Task updated");
      mutate(SWRKeys.tasks);
    } catch (error) {
      handleError({ error, title: "Unable to update task" });
    }
  }

  return <TodoistContext.Provider value={{ completeTask, deleteTask, updateTask }}>{children}</TodoistContext.Provider>;
}

const TodoistContext = React.createContext<TodoistContextProps | undefined>(undefined);

export function useTodoist(): TodoistContextProps {
  const context = React.useContext(TodoistContext);

  if (context === undefined) {
    throw new Error(`useTodoist must be used within a TodoistProvider`);
  }

  return context;
}
