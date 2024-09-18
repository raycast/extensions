import { getPreferenceValues } from "@raycast/api";
import { Device } from "src/core/devices/devices.model";
import { getDevicesService } from "src/core/devices/devices.service";
import { showAnimatedMessage, showErrorMessage, showSuccessMessage } from "src/utils";

export async function disconnectDevice(device: Device) {
  const { bluetoothBackend } = getPreferenceValues<ExtensionPreferences>();
  const devicesService = getDevicesService(bluetoothBackend);

  await showAnimatedMessage("Disconnecting...");
  const result = devicesService?.disconnectDevice(device.macAddress);
  if (result) {
    await showSuccessMessage("Device disconnected successfully");
  } else {
    await showErrorMessage("Failed to disconnect");
  }
}
