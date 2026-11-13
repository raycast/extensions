import { apex } from "@lib/common";
import { State } from "@lib/apexapi";

export async function callInputBooleanToggleService(state: State) {
  await apex.callService("input_boolean", "toggle", { entity_id: state.entity_id });
}

export async function callInputBooleanTurnOnService(state: State) {
  await apex.callService("input_boolean", "turn_on", { entity_id: state.entity_id });
}

export async function callInputBooleanTurnOffService(state: State) {
  await apex.callService("input_boolean", "turn_off", { entity_id: state.entity_id });
}

export function isEditableInputBoolean(state: State) {
  // `editable` reflects whether the helper's definition (name/icon) can be
  // edited in the UI, not whether its state can be changed - YAML-defined
  // helpers report editable: false but still accept turn_on/turn_off/toggle.
  return state.entity_id.startsWith("input_boolean");
}
