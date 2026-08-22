import { apex } from "@lib/common";
import { State } from "@lib/haapi";

export function isAutomationEditable(state: State) {
  return state.entity_id.startsWith("automation.");
}

export async function callAutomationTurnOnService(state: State) {
  await apex.callService("automation", "turn_on", { entity_id: state.entity_id });
}

export async function callAutomationTurnOffService(state: State) {
  await apex.callService("automation", "turn_off", { entity_id: state.entity_id });
}

export async function callAutomationTriggerService(state: State) {
  await apex.callService("automation", "trigger", { entity_id: state.entity_id });
}
