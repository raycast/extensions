import { Team } from "./teams";
import { request } from "../lib/request";

export type User = {
  id: number;
  name: string;
  email: string;
  current_team_id: number;
  teams: Array<Team>;
  owned_teams: Array<Team>;
  avatar_url: string;
  uses_two_factor_authentication: boolean;
  is_sandboxed: boolean;
};

export async function getUser(): Promise<User> {
  return await request<User>("user");
}
