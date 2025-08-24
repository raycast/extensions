import { get, post, put, remove } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";

export function getMyTags() {
  return get<Tag[]>("/me/tags");
}

export function createTag(workspaceId: number, name: string) {
  return post<Tag>(`/workspaces/${workspaceId}/tags`, { workspace_id: workspaceId, name });
}

export function updateTag(workspaceId: number, tagId: number, name: string) {
  return put<Tag>(`/workspaces/${workspaceId}/tags/${tagId}`, { workspace_id: workspaceId, name });
}

export function deleteTag(workspaceId: number, tagId: number) {
  return remove(`/workspaces/${workspaceId}/tags/${tagId}`);
}

/** @see {@link https://developers.track.toggl.com/docs/api/tags#response Toggl Api} */
export interface Tag extends ToggleItem {
  name: string;
  workspace_id: number;
}
