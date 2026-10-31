import { Task } from "./api";

/** Local task changes shown before Amplenote's data catches up, with the time they were made. */
export type Overrides = Record<string, { changes: Partial<Task>; at: number }>;

export function recordOverride(overrides: Overrides, taskUUID: string, changes: Partial<Task>, at: number): Overrides {
  return { ...overrides, [taskUUID]: { changes: { ...overrides[taskUUID]?.changes, ...changes }, at } };
}

export function applyOverrides<T extends Task>(tasks: T[], overrides: Overrides): T[] {
  return tasks.map((task) => ({ ...task, ...overrides[task.uuid]?.changes }));
}

/** Drops changes the reloaded data already includes: those made before the reload started. */
export function clearOverridesBefore(overrides: Overrides, time: number): Overrides {
  return Object.fromEntries(Object.entries(overrides).filter(([, override]) => override.at >= time));
}
