import { showHUD, showToast, Toast } from "@raycast/api";
import { setMaximum } from "macos-fan-control-client";

export default async function Command() {
  try {
    await setMaximum();
    await showHUD("Fans at maximum");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed",
      message: (error as Error).message,
    });
  }
}
