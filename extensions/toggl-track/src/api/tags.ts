import { get } from "./togglClient";

export function getWorkspaceTags(workspaceId: number) {
  return get<Tag[] | null>(`/workspaces/${workspaceId}/tags`);
}

// https://developers.track.toggl.com/docs/api/tags#response
export interface Tag {
  id: number;
  name: string;
  workspace_id: number;
}
