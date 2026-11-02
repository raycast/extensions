import { useCachedState } from "@raycast/utils";

/** Remembers the last Team picked in any create form so the next form starts there. */
export function useLastTeam() {
  return useCachedState<string | undefined>("last-team-id", undefined);
}
