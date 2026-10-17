import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { setMaximum } from "macos-fan-control-client";

export default async function Command() {
  try {
    await setMaximum();
    await showHUD("Fans at maximum");
  } catch (error) {
    showFailureToast(error, { title: "Failed" });
  }
}
