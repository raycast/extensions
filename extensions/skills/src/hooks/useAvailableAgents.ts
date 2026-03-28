import { useCachedPromise } from "@raycast/utils";
import { discoverAgents, KNOWN_AGENT_NAMES } from "../utils/skills-cli";

const INITIAL_DATA = { agents: KNOWN_AGENT_NAMES, skillAgentMap: {} };

export function useAvailableAgents() {
  const { data, isLoading } = useCachedPromise(discoverAgents, [], {
    keepPreviousData: true,
    initialData: INITIAL_DATA,
  });
  return {
    agents: data?.agents ?? KNOWN_AGENT_NAMES,
    skillAgentMap: data?.skillAgentMap ?? {},
    isLoading,
  };
}
