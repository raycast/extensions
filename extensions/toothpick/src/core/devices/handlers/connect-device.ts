import { getPreferenceValues } from "@raycast/api";
import { Device } from "../devices.model";
import { getDevicesService } from "../devices.service";
import { showAnimatedMessage, showErrorMessage, showSuccessMessage } from "src/utils";

export async function connectDevice(device: Device) {
  const { bluetoothBackend } = getPreferenceValues<ExtensionPreferences>();
  const devicesService = getDevicesService(bluetoothBackend);

  if (!device.controllable) {
    await showErrorMessage("This Bluetooth profile is managed by Windows.");
    return false;
  }

  await showAnimatedMessage("Connecting...");
  const result = devicesService?.connectDevice(device.macAddress);
  if (result) {
    await showSuccessMessage("Device connected successfully.");
  } else {
    await showErrorMessage("Failed to connect.");
  }
  return !!result;
}
