import { closeMainWindow, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { getFirstSelectedFinderPath } from "./finder";
import { sendPathToBlip } from "./blip";

export default async function command() {
  try {
    await closeMainWindow();
    const path = await getFirstSelectedFinderPath();
    await sendPathToBlip(path);
    await popToRoot();
    await showHUD("Sent to Blip");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send the selected Finder item to Blip.";
    await showToast({
      style: Toast.Style.Failure,
      title: "Blip send failed",
      message,
    });
  }
}
