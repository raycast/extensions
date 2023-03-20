import { request } from "./request";

export type Team = {
  teamId: string;
  displayName: string;
};

export async function getTeams() {
  return [];
  const result = await request<Team[]>("/field/teams-add-on__team-issue-field/option");
  return result;
}
