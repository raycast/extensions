import { getPreferenceValues, closeMainWindow } from "@raycast/api";
import { Device } from "../devices.model";
import { getDevicesService } from "../devices.service";
import { showAnimatedMessage, showErrorMessage, showSuccessMessage } from "src/utils";

export async function connectDevice(device: Device) {
  const { closeOnSuccessfulConnection, bluetoothBackend } = getPreferenceValues<ExtensionPreferences>();
  const devicesService = getDevicesService(bluetoothBackend);

  await showAnimatedMessage("Connecting...");
  const result = devicesService?.connectDevice(device.macAddress);
  if (result) {
    await showSuccessMessage("Device connected successfully.");
  } else {
    await showErrorMessage("Failed to connect.");
  }
  if (closeOnSuccessfulConnection) {
    closeMainWindow();
  }

  return !!result;
}
