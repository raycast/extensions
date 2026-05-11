import { showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { reconnect } from "./utils/applescript";

export default async function Command() {
  try {
    await closeMainWindow();

    const response = await reconnect();

    if (response.includes("Attempting to reconnect")) {
      await showHUD("🔄 " + response);
    } else if (response.includes("No previous device")) {
      await showHUD("ℹ️ " + response);
    } else {
      await showHUD(response);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to reconnect",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
