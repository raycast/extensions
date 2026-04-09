import { getDevicesService } from "src/core/devices/devices.service";
import { DevicesService } from "src/core/devices/devices.service";
import { showAnimatedMessage, showErrorMessage, showSuccessMessage } from "src/utils";

export default async function refreshBluetooth() {
  let devicesService: DevicesService;
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
    await showErrorMessage(`Failed to refresh Bluetooth: ${error instanceof Error ? error.message : error}`);
  }
}
