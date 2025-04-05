import { closeMainWindow, popToRoot, showHUD, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getErrorDetails, tailscale, getStatus } from "./shared";

export default async function Toggle() {
  let subtitle: string;
  try {
    // Check current status
    const isConnected = await isTailscaleConnected();
    
    if (isConnected) {
      // Disconnect
      await showToast({
        style: Toast.Style.Animated,
        title: "Disconnecting",
      });

      await updateCommandMetadata({ subtitle: "" });

      popToRoot();
      closeMainWindow();
      tailscale("down");

      showHUD("Disconnected");
      subtitle = "Disconnected";
    } else {
      // Connect
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting",
      });

      await updateCommandMetadata({ subtitle: "" });

      popToRoot();
      closeMainWindow();
      tailscale("up");

      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000));

      const data = getStatus(false);
      const magicDNSSuffix = data.MagicDNSSuffix;
      subtitle = `Connected on ${magicDNSSuffix}`;
      showHUD(subtitle);
    }
  } catch (err) {
    console.error(err);
    subtitle = getErrorDetails(err, "").title;
    showHUD(`Unable to toggle connection: ${subtitle}`);
  }
  await updateCommandMetadata({ subtitle });
}

async function isTailscaleConnected(): Promise<boolean> {
  try {
    getStatus(false);
    return true;
  } catch (err) {
    return false;
  }
} 