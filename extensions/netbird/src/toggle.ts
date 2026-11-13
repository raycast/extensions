import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getNetbirdStatus, netbirdDown, netbirdUp } from "./utils";

/**
 * Checks if NetBird is currently connected. When the status cannot be read
 * (for example the daemon is not running yet), NetBird is treated as disconnected.
 */
async function isConnected(): Promise<boolean> {
  try {
    const status = await getNetbirdStatus();
    return status.management.connected;
  } catch {
    return false;
  }
}

export default async function main() {
  try {
    const connected = await isConnected();

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: connected ? "Disconnecting from NetBird" : "Connecting to NetBird",
      message: "Please wait...",
    });

    if (connected) {
      await netbirdDown();
    } else {
      await netbirdUp();
    }

    await toast.hide();

    await closeMainWindow({ clearRootSearch: true });

    await showToast({
      style: Toast.Style.Success,
      title: connected ? "Disconnected from NetBird" : "Connected to NetBird",
      message: "",
    });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to toggle connection" });
  }
}
