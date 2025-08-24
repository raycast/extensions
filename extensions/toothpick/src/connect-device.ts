import { getPreferenceValues } from "@raycast/api";
import { ratio } from "fuzzball";
import { connectDevice } from "./core/devices/handlers/connect-device";
import { getDevicesService } from "./core/devices/devices.service";
import { showErrorMessage } from "./utils";

export default async (props: { arguments: { nameOrMacAddress: string | undefined } }) => {
  const { fuzzyRatio, bluetoothBackend } = getPreferenceValues<ExtensionPreferences>();

  if (props.arguments.nameOrMacAddress === undefined) {
    await showErrorMessage("Undefined value. Check extension preferences.");
    return;
  }

  if (isNaN(parseFloat(fuzzyRatio))) {
    await showErrorMessage("Invalid fuzzy ratio. Check extension preferences.");
    return;
  }

  const devices = getDevicesService(bluetoothBackend)?.getDevices() ?? [];

  const device = devices.find(
    (device) =>
      ratio(device.name, props.arguments.nameOrMacAddress || "") > parseFloat(fuzzyRatio) ||
      device.macAddress === props.arguments.nameOrMacAddress
  );

  if (!device) {
    await showErrorMessage("Device not found");
  } else {
    await connectDevice(device);
  }
};
