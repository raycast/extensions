import { showHUD, showToast, Toast } from "@raycast/api";
import { setAutomatic } from "macos-fan-control-client";

export default async function Command() {
  try {
    await setAutomatic();
    await showHUD("Fans on automatic");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed",
      message: (error as Error).message,
    });
  }
}
