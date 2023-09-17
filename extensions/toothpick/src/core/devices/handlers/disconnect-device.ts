import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { Device } from "src/core/devices/devices.model";
import { getDevicesService } from "src/core/devices/devices.service";

export async function disconnectDevice(device: Device) {
  const { bluetoothBackend } = getPreferenceValues();
  const devicesService = getDevicesService(bluetoothBackend);

  await showToast({ style: Toast.Style.Animated, title: "Disconnecting..." });
  const result = devicesService.disconnectDevice(device.macAddress);
  if (result) {
    await showToast({ style: Toast.Style.Success, title: "Device disconnected successfully." });
  } else {
    await showToast({ style: Toast.Style.Failure, title: "Failed to disconnect." });
  }
}
