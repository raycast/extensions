import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { setAutomatic } from "macos-fan-control-client";

export default async function Command() {
  try {
    await setAutomatic();
    await showHUD("Fans on automatic");
  } catch (error) {
    showFailureToast(error, { title: "Failed" });
  }
}
