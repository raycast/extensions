import { getPreferenceValues } from "@raycast/api";
import { getDevicesService } from "src/core/devices/devices.service";

export default async function (input: { device_mac_address: string }) {
  const { bluetoothBackend } = getPreferenceValues<ExtensionPreferences>();
  const devicesService = getDevicesService(bluetoothBackend);

  if (!devicesService) {
    throw new Error("Could not find 'blueutil'!");
  }

  devicesService.connectDevice(input.device_mac_address);
}
