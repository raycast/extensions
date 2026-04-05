import { request } from "./request";

export type TeamUser = {
  id: number;
  name: string;
  headline?: string;
  avatarUrl?: string;
  status: string;
};

export async function getTeamUsers() {
  const { data } = await request<TeamUser[]>("/team/users");
  return data.filter((user) => user.status === "active");
}
