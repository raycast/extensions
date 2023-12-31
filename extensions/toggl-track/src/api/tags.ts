import { get } from "./toggleClient";
import { Tag } from "./types";

export function getWorkspaceTags(workspaceId: number) {
  return get<Tag[] | null>(`/workspaces/${workspaceId}/tags`);
}
