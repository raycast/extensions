import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { loadState, showOverlay } from "./lib/runtime";

export default async function BreatheNow() {
  try {
    const shown = await showOverlay("manual", await loadState());
    if (!shown) await showHUD("Already breathing");
  } catch (error) {
    await showFailureToast(error, { title: "Could not start the breathing overlay" });
  }
}
