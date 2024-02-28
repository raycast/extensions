import { getPreferenceValues, showToast, Toast, closeMainWindow } from "@raycast/api";
import { Device } from "../devices.model";
import { getDevicesService } from "../devices.service";

export async function connectDevice(device: Device) {
  const { closeOnSuccessfulConnection, bluetoothBackend } = getPreferenceValues();
  const devicesService = getDevicesService(bluetoothBackend);

  await showToast({ style: Toast.Style.Animated, title: "Connecting..." });
  const result = devicesService?.connectDevice(device.macAddress);
  if (result) {
    await showToast({ style: Toast.Style.Success, title: "Device connected successfully." });
  } else {
    await showToast({ style: Toast.Style.Failure, title: "Failed to connect." });
  }
  if (closeOnSuccessfulConnection) {
    closeMainWindow();
  }
}
