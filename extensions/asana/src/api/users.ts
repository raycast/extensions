import { request } from "./request";

export type User = {
  gid: string;
  name: string;
};

export async function getMe() {
  const { data } = await request<{ data: User }>("/users/me");

  return data.data;
}

export async function getUsers(workspace: string) {
  const { data } = await request<{ data: User[] }>("/users", {
    params: {
      workspace,
    },
  });

  return data.data;
}
