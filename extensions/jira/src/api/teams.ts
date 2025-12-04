import { request } from "./request";

type TeamResponse = {
  value: string;
  displayName: string;
};
export type Team = {
  teamId: string;
  displayName: string;
};

export async function getTeams() {
  const response = await request<{ results: TeamResponse[] }>("/jql/autocompletedata/suggestions", {
    params: { fieldName: "team" },
  });
  return response?.results.map((team) => ({
    teamId: team.value,
    displayName: team.displayName,
  }));
}
