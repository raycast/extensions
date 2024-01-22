import { get } from "./togglClient";
import { Page } from "./types";

export async function getMyTasks() {
  const tasks = await get<Page<Task[]>>("/me/tasks");
  return tasks.data ?? [];
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
