import { showHUD, showToast, Toast } from "@raycast/api";
import { cycleDevice, failureMessage } from "./audio";

export default async function Command() {
  try {
    await showHUD(await cycleDevice("output"));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not switch output",
      message: failureMessage(error),
    });
  }
}
