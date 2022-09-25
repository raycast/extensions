import { showHUD, showToast, Toast } from "@raycast/api";
import { findDevice, turnOff } from "litra-glow";

export default async function main() {
  try {
    const device = findDevice();
    turnOff(device);
    await showHUD("Turned off");
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Oops! Something went wrong.",
      message: e as string,
    });
  }
}
