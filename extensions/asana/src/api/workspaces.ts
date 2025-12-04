import { request } from "./request";

export type Workspace = {
  gid: string;
  name: string;
  is_organization: boolean;
};

export async function getWorkspaces() {
  const { data } = await request<{ data: Workspace[] }>("/workspaces", {
    params: { opt_fields: "gid,name,is_organization" },
  });

  return data.data;
}
