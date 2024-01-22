import { get } from "./togglClient";

export function getMyWorkspaces() {
  return get<Workspace[]>("/me/workspaces");
}

// https://developers.track.toggl.com/docs/api/workspaces#response-4
export interface Workspace {
  id: number;
  name: string;
  premium: boolean;
}
