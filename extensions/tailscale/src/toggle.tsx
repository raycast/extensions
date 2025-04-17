import { getErrorDetails, getStatus } from "./shared";
import Disconnect from "./disconnect";
import Connect from "./connect";
import { showHUD, showToast, Toast } from "@raycast/api";

export default async function Toggle() {
  let subtitle = "Tailscale";
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
    subtitle = getErrorDetails(err, "").title;
    showHUD(`Unable to connect: ${subtitle}`);
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
