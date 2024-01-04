import { get } from "./togglClient";

export function getWorkspaces() {
  return get<Workspace[]>("/workspaces");
}

// https://developers.track.toggl.com/docs/api/workspaces#response-4
export interface Workspace {
  id: number;
  name: string;
  premium: boolean;
}
