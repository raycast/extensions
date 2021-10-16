import React from "react";
import { mutate } from "swr";
import * as api from "./api";

import { Task, TaskPayload } from "./types";

interface TodoistContextProps {
  completeTask: (task: Task) => void;
  deleteTask: (task: Task) => void;
  updateTask: (task: Task, payload: TaskPayload) => void;
}

interface TodoistProviderProps {
  children: React.ReactNode;
  path: string;
}

export function TodoistProvider({ children, path }: TodoistProviderProps): JSX.Element {
  async function completeTask(task: Task) {
    await api.completeTask(task.id);
    mutate(path);
  }

  async function deleteTask(task: Task) {
    await api.deleteTask(task.id);
    mutate(path);
  }

  async function updateTask(updatedTask: Task, payload: TaskPayload) {
    await api.updateTask(updatedTask.id, payload);
    mutate(path);
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
