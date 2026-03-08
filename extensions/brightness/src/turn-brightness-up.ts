import { showHUD, showToast, Toast } from "@raycast/api";
import { stepBrightness } from "./utils/brightness";

export default async function main() {
  try {
    const result = await stepBrightness("up");
    await showHUD(`Brightness set to ${result.brightness}%`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't set brightness",
      message: error instanceof Error ? error.message : "Open System Settings > Displays, then try again.",
    });
  }
}
