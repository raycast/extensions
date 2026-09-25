import { getPreferenceValues } from "@raycast/api";
import { refreshDevice } from "./core/devices/handlers/refresh-device";
import { getDevicesService } from "./core/devices/devices.service";
import { findDevice } from "./core/devices/find-device";
import { showErrorMessage } from "./utils";

export default async function Command(props: { arguments: { nameOrMacAddress: string | undefined } }) {
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
    await refreshDevice(device);
  } catch (error) {
    await showErrorMessage(`${error}`);
  }
}
