import { createContext, useContext, ReactNode, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { ClickUpTask } from "../types/clickup";

interface TasksContextValue {
  revertTaskStatus: (taskId: string, originalStatus: string) => void;
  tasks: ClickUpTask[];
  updateTaskStatus: (taskId: string, newStatus: string) => void;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

interface Props {
  children: ReactNode;
  tasks: ClickUpTask[];
}

export function TasksProvider({ children, tasks: initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const prevTasksRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentTasksStr = JSON.stringify(initialTasks);
    if (prevTasksRef.current !== currentTasksStr) {
      prevTasksRef.current = currentTasksStr;
      setTasks(initialTasks);
    }
  }, [initialTasks]);

  const updateTaskStatus = useCallback((taskId: string, newStatus: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === taskId ? { ...task, status: { ...task.status, status: newStatus } } : task)),
    );
  }, []);

  const revertTaskStatus = useCallback((taskId: string, originalStatus: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: { ...task.status, status: originalStatus } } : task,
      ),
    );
  }, []);

  const value = useMemo<TasksContextValue>(
    () => ({ revertTaskStatus, tasks, updateTaskStatus }),
    [revertTaskStatus, tasks, updateTaskStatus],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasksContext() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error("useTasksContext must be used within a TasksProvider");
  }
  return context;
}
