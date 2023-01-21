import { request } from "./request";

export type Workspace = {
  gid: string;
  name: string;
  is_organization: boolean;
};

export async function getWorkspaces() {
  const { data } = await request<{ data: Workspace[] }>("/workspaces");

  return data.data;
}
