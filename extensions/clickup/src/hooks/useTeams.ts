import type { TeamsResponse } from "../types/teams.dt";
import useClickUp from "./useClickUp";

function useTeams() {
  const { isLoading, data } = useClickUp<TeamsResponse>("/team");
  return { isLoading, teams: data?.teams ?? [] };
}

export { useTeams };
