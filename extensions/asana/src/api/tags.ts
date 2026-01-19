import { request } from "./request";

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
