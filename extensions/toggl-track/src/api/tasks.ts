import { get } from "./togglClient";

export function getWorkspaceTasks(workspaceId: number) {
  return get<Task[]>(`/workspaces/${workspaceId}/tasks`);
}

// https://developers.track.toggl.com/docs/api/tasks/index.html#response
export interface Task {
  active: boolean;
  id: number;
  name: string;
  project_id: number;
  workspace_id: number;
  user_id: number | null;
}
