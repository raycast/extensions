import { ha } from "@lib/common";
import { State } from "@lib/haapi";

export async function callInputBooleanToggleService(state: State) {
  await ha.callService("input_boolean", "toggle", { entity_id: state.entity_id });
}

export async function callInputBooleanTurnOnService(state: State) {
  await ha.callService("input_boolean", "turn_on", { entity_id: state.entity_id });
}

export async function callInputBooleanTurnOffService(state: State) {
  await ha.callService("input_boolean", "turn_off", { entity_id: state.entity_id });
}

export function isEditableInputBoolean(state: State) {
  return state.entity_id.startsWith("input_boolean") && state.attributes.editable === true;
}
