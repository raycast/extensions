import { useCachedState } from "@raycast/utils";

export function useSelectedTeam() {
  return useCachedState("teamId", "-1");
}
