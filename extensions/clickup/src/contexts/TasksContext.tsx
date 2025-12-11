import { createContext, ReactNode, useContext, useMemo } from "react";

import type { ClickUpTask } from "../types/clickup";

interface TasksContextValue {
  tasks: ClickUpTask[];
  updateTaskStatus: (taskId: string, newStatus: string) => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

interface Props {
  children: ReactNode;
  tasks: ClickUpTask[];
  updateTaskStatus: (taskId: string, newStatus: string) => Promise<void>;
}

export function TasksProvider({ children, tasks, updateTaskStatus }: Props) {
  const value = useMemo<TasksContextValue>(() => ({ tasks, updateTaskStatus }), [tasks, updateTaskStatus]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasksContext() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error("useTasksContext must be used within a TasksProvider");
  }
  return context;
}
