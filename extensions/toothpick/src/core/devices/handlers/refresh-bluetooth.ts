import { getDevicesService } from "src/core/devices/devices.service";
import { showAnimatedMessage, showErrorMessage, showSuccessMessage } from "src/utils";

export default async function refreshBluetooth() {
  let devicesService: ReturnType<typeof getDevicesService>;
  try {
    devicesService = getDevicesService("blueutil");
  } catch {
    await showErrorMessage(
      "Refresh All requires blueutil. Install it with Homebrew or set Blueutil Directory in preferences.",
    );
    return;
  }

  try {
    await showAnimatedMessage("Refreshing Bluetooth...");
    devicesService.refreshBluetooth();
    await showSuccessMessage("Bluetooth refreshed successfully");
  } catch (error) {
    // Provide guidance that Bluetooth may be disabled after failure
    const errorMessage = `Failed to refresh Bluetooth: ${error instanceof Error ? error.message : error}. Bluetooth may have been disabled; please re‑enable it manually.`;
    await showErrorMessage(errorMessage);
  }
}
