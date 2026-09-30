import { ha } from "@lib/common";
import { State } from "@lib/haapi";

export function isVacuumEditable(state: State) {
  return state.entity_id.startsWith("vacuum");
}

export async function callVacuumLocateService(state: State) {
  await ha.callService("vacuum", "locate", { entity_id: state.entity_id });
}

export async function callVacuumStartService(state: State) {
  await ha.callService("vacuum", "start", { entity_id: state.entity_id });
}

export async function callVacuumPauseService(state: State) {
  await ha.callService("vacuum", "pause", { entity_id: state.entity_id });
}

export async function callVacuumStopService(state: State) {
  await ha.callService("vacuum", "stop", { entity_id: state.entity_id });
}

export async function callVacuumTurnOnService(state: State) {
  await ha.callService("vacuum", "turn_on", { entity_id: state.entity_id });
}

export async function callVacuumTurnOffService(state: State) {
  await ha.callService("vacuum", "turn_off", { entity_id: state.entity_id });
}

export async function callVacuumReturnToBaseService(state: State) {
  await ha.callService("vacuum", "return_to_base", { entity_id: state.entity_id });
}
