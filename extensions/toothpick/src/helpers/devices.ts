import { showToast, Toast, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { Device } from "src/types/device";

export async function connectDevice(device: Device) {
  await showToast({ style: Toast.Style.Animated, title: "Connecting..." });
  try {
    device.openConnection();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to connect." });
    return;
  }
  await showToast({ style: Toast.Style.Success, title: "Device connected successfully." });
  const { closeOnSuccessfulConnection } = getPreferenceValues();
  if (closeOnSuccessfulConnection) {
    closeMainWindow();
  }
}

export async function disconnectDevice(device: Device) {
  await showToast({ style: Toast.Style.Animated, title: "Disconnecting..." });
  try {
    device.closeConnection();
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to disconnect." });
    return;
  }
  await showToast({ style: Toast.Style.Success, title: "Device disconnected successfully." });
}
