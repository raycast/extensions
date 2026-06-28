import { closeMainWindow, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { sendPathToBlip } from "./blip";
import { getFirstSelectedFilePath } from "./finder";
import { fileManagerName } from "./platform";

export default async function command() {
  try {
    await closeMainWindow();
    const path = await getFirstSelectedFilePath();
    await sendPathToBlip(path);
    await popToRoot();
    await showHUD("Sent to Blip");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Unable to send the selected ${fileManagerName} item to Blip.`;
    await showToast({
      style: Toast.Style.Failure,
      title: "Blip send failed",
      message,
    });
  }
}
