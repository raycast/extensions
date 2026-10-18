import { useState } from "react";
import { nowSeconds, Task } from "./api";

export type TaskChange = "completed" | "dismissed" | "reopened" | "updated";

export function useTaskChanges() {
  const [overrides, setOverrides] = useState<Record<string, Partial<Task>>>({});

  const apply = <T extends Task>(tasks: T[]): T[] => tasks.map((task) => ({ ...task, ...overrides[task.uuid] }));

  const record = (task: Task, change: TaskChange, updates: Partial<Task> = {}) => {
    const changed = {
      completed: { completedAt: nowSeconds() },
      dismissed: { dismissedAt: nowSeconds() },
      reopened: { completedAt: undefined, dismissedAt: undefined },
      updated: updates,
    }[change];
    setOverrides((previous) => ({ ...previous, [task.uuid]: { ...previous[task.uuid], ...changed } }));
  };

  const reset = () => setOverrides({});

  return { apply, record, reset };
}
