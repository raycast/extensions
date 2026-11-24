import { showHUD } from "@raycast/api";
import { errorMessage, send } from "./helper";

export default async function ToggleLidLight() {
  try {
    const state = await send({ operation: "toggle" });
    await showHUD(state.setting === "on" ? "Lid light on" : "Lid light off");
  } catch (error) {
    await showHUD(errorMessage(error));
  }
}
