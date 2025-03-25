import { ha } from "@lib/common";
import { State } from "@lib/haapi";

export async function callSceneActivateService(state: State) {
  await ha.callService("scene", "turn_on", { entity_id: state.entity_id });
}
