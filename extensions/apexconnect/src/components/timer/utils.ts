import { apex } from "@lib/common";
import { State } from "@lib/apexapi";

export function isTimerEditable(state: State) {
  // `editable` reflects whether the timer's definition can be edited in the
  // UI, not whether its state can be changed - YAML-defined timers report
  // editable: false but still accept start/pause/cancel.
  return state.entity_id.startsWith("timer");
}

export async function callTimerStartService(state: State) {
  await apex.callService("timer", "start", { entity_id: state.entity_id });
}

export async function callTimerPauseService(state: State) {
  await apex.callService("timer", "pause", { entity_id: state.entity_id });
}

export async function callTimerCancelService(state: State) {
  await apex.callService("timer", "cancel", { entity_id: state.entity_id });
}
