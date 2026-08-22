import { apex } from "@lib/common";
import { State } from "@lib/haapi";

export async function callScriptRunService(state: State) {
  await apex.callService("script", "turn_on", { entity_id: state.entity_id });
}
