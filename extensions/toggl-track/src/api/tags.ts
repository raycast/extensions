import { get, post, put, remove } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";
import { cacheHelper } from "@/helpers/cache-helper";

export function getMyTags() {
  return cacheHelper.getOrSet("tags", () => get<Tag[]>("/me/tags"));
}

export function createTag(workspaceId: number, name: string) {
  return cacheHelper.upsert("tags", () =>
    post<Tag>(`/workspaces/${workspaceId}/tags`, { workspace_id: workspaceId, name }),
  );
}

export function updateTag(workspaceId: number, tagId: number, name: string) {
  return cacheHelper.upsert("tags", () =>
    put<Tag>(`/workspaces/${workspaceId}/tags/${tagId}`, { workspace_id: workspaceId, name }),
  );
}

export async function deleteTag(workspaceId: number, tagId: number) {
  await remove(`/workspaces/${workspaceId}/tags/${tagId}`);
  cacheHelper.removeItem("tags", tagId);
}

/** @see {@link https://developers.track.toggl.com/docs/api/tags#response Toggl Api} */
export interface Tag extends ToggleItem {
  name: string;
  workspace_id: number;
}
