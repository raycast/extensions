import { request } from "./request";
import { Task } from "./tasks";

export type Tag = {
  gid: string;
  name: string;
};

export async function getTagsForWorkspace(workspaceGid: string) {
  const { data } = await request<{ data: Tag[] }>(`/workspaces/${workspaceGid}/tags`, {
    params: { opt_fields: "gid,name" },
  });

  return data.data;
}

export async function addTag(taskId: string, tagId: string) {
  const payload = { tag: tagId };
  const { data } = await request<{ data: Task }>(`/tasks/${taskId}/addTag`, {
    method: "POST",
    data: { data: payload },
  });

  return data.data;
}

export async function removeTag(taskId: string, tagId: string) {
  const payload = { tag: tagId };
  const { data } = await request<{ data: Task }>(`/tasks/${taskId}/removeTag`, {
    method: "POST",
    data: { data: payload },
  });

  return data.data;
}
