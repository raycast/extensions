import { closeMainWindow, popToRoot, showHUD, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getErrorDetails, tailscale, getStatus } from "./shared";

export default async function Toggle() {
  let subtitle = "Tailscale";
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
      
      // Await the disconnect command
      await tailscale("down");

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
      
      // Await the connect command
      await tailscale("up");

      // Wait briefly for connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000));

      const data = getStatus(false);
      const magicDNSSuffix = data.MagicDNSSuffix;
      subtitle = `Connected on ${magicDNSSuffix}`;
      showHUD(subtitle);
    }
  } catch (err) {
    await showFailureToast(err, { title: "Failed to toggle connection" });
    subtitle = getErrorDetails(err, "").title;
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