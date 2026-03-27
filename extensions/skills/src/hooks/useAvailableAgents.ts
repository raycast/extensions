import { useCachedPromise } from "@raycast/utils";
import { discoverAgents } from "../utils/skills-cli";

export function useAvailableAgents() {
  const { data, isLoading } = useCachedPromise(discoverAgents, [], { keepPreviousData: true });
  return {
    agents: data?.agents ?? [],
    skillAgentMap: data?.skillAgentMap ?? {},
    isLoading,
  };
}
