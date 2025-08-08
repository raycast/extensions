import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { launchWisprFlow } from "./utils";

export default async function Command() {
  try {
    await launchWisprFlow();
    await showToast({
      style: Toast.Style.Success,
      title: "Launching Wispr Flow",
      message: "Opening the application...",
    });
    await closeMainWindow();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to launch Wispr Flow",
    });
  }
}
