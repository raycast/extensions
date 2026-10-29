import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { duplicateTab } from "./safari";

export default async function Command() {
  try {
    // Dismiss Raycast before Safari activates so it does not reclaim keyboard focus.
    await closeMainWindow();
    await duplicateTab();
    await showHUD("Duplicated tab");
  } catch (error) {
    console.error(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Could not duplicate tab",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
