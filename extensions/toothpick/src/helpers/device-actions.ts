import { showToast, Toast, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { openConnection, closeConnection } from "src/services/devices";

export async function connectDevice(deviceMacAddress: string) {
  await showToast({ style: Toast.Style.Animated, title: "Connecting..." });
  try {
    openConnection(deviceMacAddress);
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

export async function disconnectDevice(deviceMacAddress: string) {
  await showToast({ style: Toast.Style.Animated, title: "Disconnecting..." });
  try {
    closeConnection(deviceMacAddress);
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to disconnect." });
    return;
  }
  await showToast({ style: Toast.Style.Success, title: "Device disconnected successfully." });
}
