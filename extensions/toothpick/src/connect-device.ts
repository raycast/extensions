import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ratio } from "fuzzball";
import { connectDevice } from "./helpers/device-actions";
import { getDevices } from "./services/devices";

export default async (props: { arguments: { nameOrMacAddress: string } }) => {
  const { fuzzyRatio } = getPreferenceValues();
  if (isNaN(parseFloat(fuzzyRatio))) {
    await showToast({ style: Toast.Style.Failure, title: "Invalid fuzzy ratio. Check extension preferences." });
    return;
  }

  const devices = getDevices();
  const device = devices.find(
    (device) =>
      ratio(device.name, props.arguments.nameOrMacAddress) > fuzzyRatio ||
      device.macAddress === props.arguments.nameOrMacAddress
  );

  if (device === undefined) {
    await showToast({ style: Toast.Style.Failure, title: "Device not found." });
  } else {
    connectDevice(device.macAddress);
  }
};
