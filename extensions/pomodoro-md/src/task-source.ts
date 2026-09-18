import { getAppPreferences } from "./preferences";
import { Task } from "./parser";
import { DailyNoteTaskSource } from "./dailynote-tasks";
import { ManualTaskSource } from "./manual-tasks";

export interface TaskGroup {
  name: string;
  tasks: Task[];
}

/** "busy": another command held the session lock; nothing was changed. */
export type MarkResult = "ok" | "busy";

export interface TaskSource {
  getTasks(): Promise<TaskGroup[]>;
  addTask?(title: string): Promise<void>;
  removeTask?(taskTitle: string): Promise<void>;
  markDone?(taskTitle: string): Promise<MarkResult>;
  markSubtaskDone?(
    taskTitle: string,
    subtaskTitle: string,
  ): Promise<MarkResult>;
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
