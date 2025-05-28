import { get, post } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";

export function getMyTasks() {
  return get<Task[]>("/me/tasks");
}

export function createTask(workspaceId: number, projectId: number, name: string) {
  return post<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, { name });
}

/** @see {@link https://developers.track.toggl.com/docs/api/tasks#response Toggl Api} */
export interface Task extends ToggleItem {
  active: boolean;
  estimated_seconds: number | null;
  name: string;
  project_id: number;
  recurring: boolean;
  tracked_seconds: number;
  /** Task assignee */
  user_id: number | null;
  workspace_id: number;
}
