import { ha } from "../../common";
import { State } from "../../haapi";

export async function callSceneActivateService(state: State) {
  await ha.callService("scene", "turn_on", { entity_id: state.entity_id });
}
