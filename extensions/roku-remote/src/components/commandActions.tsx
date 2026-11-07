import { showToast, Toast } from "@raycast/api";
import { describeRokuError } from "../lib/roku";
import type { RokuDevice } from "../lib/types";

export async function sendCommand(device: RokuDevice, label: string, command: () => Promise<void>) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Sending ${label.toLowerCase()}…`,
    message: device.name,
  });
  try {
    await command();
    toast.style = Toast.Style.Success;
    toast.title = "Command sent";
    toast.message = `${device.name}: ${label}`;
  } catch (cause) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't send command";
    toast.message = describeRokuError(cause);
  }
}
