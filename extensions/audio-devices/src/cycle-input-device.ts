import { showHUD, showToast, Toast } from "@raycast/api";
import { cycleDevice, failureMessage } from "./audio";

export default async function Command() {
  try {
    await showHUD(await cycleDevice("input"));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not switch input",
      message: failureMessage(error),
    });
  }
}
