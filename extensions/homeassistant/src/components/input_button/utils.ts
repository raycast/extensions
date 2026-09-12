import { ha } from "@lib/common";
import { State } from "@lib/haapi";

export async function callInputButtonPressService(state: State) {
  await ha.callService("input_button", "press", { entity_id: state.entity_id });
}

export function isEditableInputButton(state: State) {
  return state.entity_id.startsWith("input_button") && state.state !== "unavailable";
}
