import { apex } from "@lib/common";
import { State } from "@lib/apexapi";

export async function callSceneActivateService(state: State) {
  await apex.callService("scene", "turn_on", { entity_id: state.entity_id });
}
