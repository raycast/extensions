import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { errorText, stopSound } from "./api";

export default async function Command() {
  try {
    const tipsPaused = await stopSound();
    await showHUD(tipsPaused ? "Stopped. Tip alerts are paused" : "Stopped");
  } catch (e) {
    await showFailureToast(e, errorText(e));
  }
}
