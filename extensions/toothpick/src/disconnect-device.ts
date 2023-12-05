import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ratio } from "fuzzball";
import { disconnectDevice } from "./core/devices/handlers/disconnect-device";
import { getDevicesService } from "./core/devices/devices.service";

export default async (props: { arguments: { nameOrMacAddress: string } }) => {
  const { fuzzyRatio, bluetoothBackend } = getPreferenceValues();

  if (isNaN(parseFloat(fuzzyRatio))) {
    await showToast({ style: Toast.Style.Failure, title: "Invalid fuzzy ratio. Check extension preferences." });
    return;
  }

  const devices = getDevicesService(bluetoothBackend)?.getDevices() ?? [];

  const device = devices.find(
    (device) =>
      ratio(device.name, props.arguments.nameOrMacAddress) > fuzzyRatio ||
      device.macAddress === props.arguments.nameOrMacAddress
  );

  if (device === undefined) {
    await showToast({ style: Toast.Style.Failure, title: "Device not found." });
  } else {
    await disconnectDevice(device);
  }
};
