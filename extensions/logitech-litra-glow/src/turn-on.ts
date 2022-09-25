import { showHUD, showToast, Toast } from "@raycast/api";
import { findDevice, turnOn } from "litra-glow";

export default async function main() {
  try {
    const device = findDevice();
    turnOn(device);
    await showHUD("Turned on");
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Oops! Something went wrong.",
      message: e as string,
    });
  }
}
