import { ha } from "@lib/common";
import { State } from "@lib/haapi";

export function isTimerEditable(state: State) {
  return state.entity_id.startsWith("timer") && state.attributes.editable === true;
}

export async function callTimerStartService(state: State) {
  await ha.callService("timer", "start", { entity_id: state.entity_id });
}

export async function callTimerPauseService(state: State) {
  await ha.callService("timer", "pause", { entity_id: state.entity_id });
}

export async function callTimerCancelService(state: State) {
  await ha.callService("timer", "cancel", { entity_id: state.entity_id });
}
