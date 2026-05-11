import { useHAStates } from "@components/hooks";
import { filterViaPreferencePatterns } from "@components/state/utils";
import { StatesList } from "@components/state/list";

export default function CustomEntitiesCommand() {
  const { states } = useHAStates();
  const entities = filterViaPreferencePatterns(states, []);

  return <StatesList domain="" entitiesState={entities} />;
}
