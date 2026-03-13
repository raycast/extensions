import { getPreferenceValues } from "@raycast/api";
import { getDevicesService } from "src/core/devices/devices.service";

/**
 * Only mention the MAC address if the user explicitly asks for them
 */
export default async function () {
  const { bluetoothBackend } = getPreferenceValues<ExtensionPreferences>();
  const devicesService = getDevicesService(bluetoothBackend);

  if (!devicesService) {
    throw new Error("Could not find 'blueutil'!");
  }

  const devices = devicesService.getDevices();

  return devices.map((device) => ({
    name: device.name,
    type: device.type,
    connected: device.connected,
    batteryLevels: device.batteryLevels,
    macAddress: device.macAddress,
  }));
}
