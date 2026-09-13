import { apex } from "@lib/common";
import { State } from "@lib/haapi";

export function isVacuumEditable(state: State) {
  return state.entity_id.startsWith("vacuum");
}

export async function callVacuumLocateService(state: State) {
  await apex.callService("vacuum", "locate", { entity_id: state.entity_id });
}

export async function callVacuumStartService(state: State) {
  await apex.callService("vacuum", "start", { entity_id: state.entity_id });
}

export async function callVacuumPauseService(state: State) {
  await apex.callService("vacuum", "pause", { entity_id: state.entity_id });
}

export async function callVacuumStopService(state: State) {
  await apex.callService("vacuum", "stop", { entity_id: state.entity_id });
}

export async function callVacuumTurnOnService(state: State) {
  await apex.callService("vacuum", "turn_on", { entity_id: state.entity_id });
}

export async function callVacuumTurnOffService(state: State) {
  await apex.callService("vacuum", "turn_off", { entity_id: state.entity_id });
}

export async function callVacuumReturnToBaseService(state: State) {
  await apex.callService("vacuum", "return_to_base", { entity_id: state.entity_id });
}
