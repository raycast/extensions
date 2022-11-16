import { showToast, Toast } from "@raycast/api";
import { connectDevice } from "./helpers/device-actions";
import { findDevice } from "./services/devices";

export default async (props: { arguments: { nameOrMacAddress: string } }) => {
  showToast({ style: Toast.Style.Animated, title: "Searching device..." });
  const device = findDevice(props.arguments.nameOrMacAddress);
  if (device === undefined) {
    showToast({ style: Toast.Style.Failure, title: "Device not found." });
  } else {
    connectDevice(device.macAddress);
  }
};
