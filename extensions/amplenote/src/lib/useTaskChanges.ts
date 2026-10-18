import { useState } from "react";
import { nowSeconds, Task } from "./api";
import { applyOverrides, clearOverridesBefore, Overrides, recordOverride } from "./taskOverrides";

export type TaskChange = "completed" | "dismissed" | "reopened" | "updated";

export function useTaskChanges() {
  const [overrides, setOverrides] = useState<Overrides>({});

  const apply = <T extends Task>(tasks: T[]): T[] => applyOverrides(tasks, overrides);

  const record = (task: Task, change: TaskChange, updates: Partial<Task> = {}) => {
    const changed = {
      completed: { completedAt: nowSeconds() },
      dismissed: { dismissedAt: nowSeconds() },
      reopened: { completedAt: undefined, dismissedAt: undefined },
      updated: updates,
    }[change];
    setOverrides((previous) => recordOverride(previous, task.uuid, changed, Date.now()));
  };

  /** Reloads with `reload`, then drops only the changes made before the reload started. */
  const refresh = (reload: () => Promise<unknown>) => {
    const started = Date.now();
    void reload().finally(() => setOverrides((previous) => clearOverridesBefore(previous, started)));
  };

  return { apply, record, refresh };
}
