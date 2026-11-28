import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { describeHUD, resetDim } from "./state";

export default async function Command() {
  try {
    const state = await resetDim();
    await showHUD(describeHUD(state));
  } catch (error) {
    await showFailureToast(error, { title: "Could not reset Dimmer" });
  }
}
