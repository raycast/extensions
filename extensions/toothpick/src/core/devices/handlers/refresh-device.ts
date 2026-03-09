import { getPreferenceValues, closeMainWindow } from "@raycast/api";
import { Device } from "../devices.model";
import { getDevicesService } from "../devices.service";
import { showAnimatedMessage, showErrorMessage, showSuccessMessage, showWarningMessage } from "src/utils";

export async function refreshDevice(device: Device) {
  const { closeOnSuccessfulConnection, bluetoothBackend } = getPreferenceValues<ExtensionPreferences>();
  const devicesService = getDevicesService(bluetoothBackend);

  await showAnimatedMessage("Disconnecting...");
  const disconnectResult = devicesService?.disconnectDevice(device.macAddress);
  if (disconnectResult) {
    await showSuccessMessage("Device disconnected successfully");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await showAnimatedMessage("Reconnecting...");
  } else {
    await showWarningMessage("Failed to disconnect. Reconnecting anyway…");
  }

  const connectResult = devicesService?.connectDevice(device.macAddress);
  if (connectResult) {
    await showSuccessMessage("Device connected successfully.");
  } else {
    await showErrorMessage("Failed to connect.");
  }
  if (closeOnSuccessfulConnection) {
    closeMainWindow();
  }

  return !!disconnectResult && connectResult;
}
