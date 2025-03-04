import { SpacesResponse } from "../types/spaces.dt";
import useClickUp from "./useClickUp";

function useSpaces(teamId: string) {
  const { isLoading, data } = useClickUp<SpacesResponse>(`/team/${teamId}/space?archived=false`);
  return { isLoading, spaces: data?.spaces ?? [] };
}

export { useSpaces };
