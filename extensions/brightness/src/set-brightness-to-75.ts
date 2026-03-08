import { showHUD, showToast, Toast } from "@raycast/api";
import { setBrightnessToPercent } from "./utils/brightness";

export default async function main() {
  try {
    await setBrightnessToPercent(75);
    await showHUD("Brightness set to 75%");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't set brightness",
      message: error instanceof Error ? error.message : "Open System Settings > Displays, then try again.",
    });
  }
}
