import { ha } from "@lib/common";
import { State } from "@lib/haapi";

export function getInputSelectSelectableOptions(state: State) {
  const s = state;
  if (!s.entity_id.startsWith("input_select") || s.state === "unavailable") {
    return;
  }
  const options: string[] | undefined = s.attributes.options;
  if (!options || options.length <= 0) {
    return;
  }
  const selectableOptions = options?.filter((o) => o !== s.state);
  return selectableOptions;
}

export async function callInputSelectSelectOptionService(state: State, option: string) {
  await ha.callService("input_select", "select_option", { entity_id: state.entity_id, option });
}
