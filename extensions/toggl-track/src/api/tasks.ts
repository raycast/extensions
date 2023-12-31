import { get } from "./toggleClient";
import { Task } from "./types";

export function getTasks(workspaceId: number) {
  return get<Task[]>(`/workspaces/${workspaceId}/tasks`);
}
