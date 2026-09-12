import { getPreferenceValues } from "@raycast/api";
import { connectDevice } from "./core/devices/handlers/connect-device";
import { disconnectDevice } from "./core/devices/handlers/disconnect-device";
import { getDevicesService } from "./core/devices/devices.service";
import { findDevice } from "./core/devices/find-device";
import { showErrorMessage } from "./utils";

export default async (props: { arguments: { nameOrMacAddress: string | undefined } }) => {
  const { fuzzyRatio, bluetoothBackend } = getPreferenceValues<ExtensionPreferences>();
  const nameOrMacAddress = props.arguments.nameOrMacAddress?.trim();

  if (!nameOrMacAddress) {
    await showErrorMessage("Missing device. Check extension preferences.");
    return;
  }

  try {
    const devices = getDevicesService(bluetoothBackend)?.getDevices() ?? [];
    const device = findDevice(devices, nameOrMacAddress, fuzzyRatio);

    if (!device) throw new Error("Device not found");
    if (device.connected) {
      await disconnectDevice(device);
    } else {
      await connectDevice(device);
    }
  } catch (error) {
    await showErrorMessage(`${error}`);
  }
};
