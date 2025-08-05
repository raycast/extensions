import { showFailureToast } from "@raycast/utils";
import Disconnect from "./disconnect";
import Connect from "./connect";
import { showToast, Toast } from "@raycast/api";
import { getStatus } from "./shared";

export default async function Toggle() {
  try {
    const isConnected = await isTailscaleConnected();

    if (isConnected) {
      // Disconnect
      await showToast({
        style: Toast.Style.Animated,
        title: "Disconnecting",
      });

      await Disconnect();
    } else {
      // Connect
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting",
      });

      await Connect();
    }
  } catch (err) {
    await showFailureToast(err, { title: "Failed to toggle connection" });
  }
}

async function isTailscaleConnected(): Promise<boolean> {
  try {
    getStatus(false);
    return true;
  } catch (err) {
    return false;
  }
}
