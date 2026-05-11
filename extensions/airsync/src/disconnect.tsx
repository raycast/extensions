import { showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { disconnect } from "./utils/applescript";

export default async function Command() {
  try {
    await closeMainWindow();

    const response = await disconnect();

    if (response.includes("Disconnected from")) {
      await showHUD("✅ " + response);
    } else if (response.includes("Not connected")) {
      await showHUD("ℹ️ " + response);
    } else {
      await showHUD(response);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to disconnect",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
