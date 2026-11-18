import { useHAStates } from "@components/hooks";
import { filterViaPreferencePatterns } from "@components/state/utils";
import { StatesList } from "@components/state/list";
import { LaunchProps } from "@raycast/api";

export default function CustomEntitiesCommand(props: LaunchProps) {
  const { states } = useHAStates();
  const entities = filterViaPreferencePatterns(states, []);

  return <StatesList domain="" entitiesState={entities} initialSearchText={props.fallbackText} />;
}
