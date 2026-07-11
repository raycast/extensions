import { request, requestAll } from "./request";

export type User = {
  gid: string;
  name: string;
};

export async function getMe() {
  const { data } = await request<{ data: User }>("/users/me");

  return data.data;
}

export async function getUsers(workspace: string) {
  return requestAll<User>("/users", {
    params: {
      workspace,
    },
  });
}
