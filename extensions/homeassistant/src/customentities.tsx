import { useHAStates } from "@components/hooks";
import { filterViaPreferencePatterns } from "@components/state/utils";
import { CustomStatesList } from "@components/state/customList";

export default function CustomEntitiesCommand() {
  const { states } = useHAStates();
  const entities = filterViaPreferencePatterns(states, []);

  return <CustomStatesList entitiesState={entities} />;
}
