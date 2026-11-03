import { getAppPreferences } from "./preferences";
import { Task } from "./parser";
import { DailyNoteTaskSource } from "./dailynote-tasks";
import { ManualTaskSource } from "./manual-tasks";

export interface TaskGroup {
  name: string;
  tasks: Task[];
}

/**
 * Outcome of a task edit. "busy": another command held the session lock for
 * the whole wait; "error": the lock could not be taken. In both cases nothing
 * was changed.
 */
export type EditResult =
  | { status: "ok" }
  | { status: "busy" }
  | { status: "error"; error: unknown };

export interface TaskSource {
  getTasks(): Promise<TaskGroup[]>;
  addTask?(title: string): Promise<EditResult>;
  removeTask?(taskTitle: string): Promise<EditResult>;
  markDone?(taskTitle: string): Promise<EditResult>;
  markSubtaskDone?(
    taskTitle: string,
    subtaskTitle: string,
  ): Promise<EditResult>;
}

export type TaskMode = "manual" | "dailynote";

export function getTaskMode(): TaskMode {
  return getAppPreferences().taskMode;
}

export function createTaskSource(): TaskSource {
  if (getTaskMode() === "dailynote") {
    return new DailyNoteTaskSource();
  }
  return new ManualTaskSource();
}
