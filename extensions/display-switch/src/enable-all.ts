import { showHUD, showToast, Toast } from "@raycast/api";
import { controller, errorMessage } from "./backend";
import { displayWarnings } from "./core";
export default async function Command() {
  try {
    const displays = await controller.enableAll();
    const warning = displayWarnings(displays);
    if (warning) await showToast({ style: Toast.Style.Success, title: "All displays enabled", message: warning });
    else await showHUD("All displays enabled");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Enable Displays",
      message: errorMessage(error),
    });
  }
}
