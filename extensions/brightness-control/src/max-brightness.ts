import { showHUD, showToast, Toast } from "@raycast/api";
import { isLunarInstalled, getDisplays, getCursorDisplay, setBrightnessForDisplay } from "./utils/lunar";

export default async function Command() {
  const status = isLunarInstalled();

  if (!status.app || !status.cli) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Lunar Not Installed",
      message: !status.app ? "Install Lunar: brew install --cask lunar" : "Run: Lunar install-cli",
    });
    return;
  }

  try {
    const allDisplays = await getDisplays();

    if (allDisplays.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Displays Found",
        message: "Make sure Lunar is running and displays are connected",
      });
      return;
    }

    // Get the display where cursor is currently located
    const cursorDisplaySerial = await getCursorDisplay();

    let targetDisplay = allDisplays.find((d) => d.serial === cursorDisplaySerial);

    if (!targetDisplay) {
      targetDisplay = allDisplays.find((d) => d.main) || allDisplays[0];
    }

    await setBrightnessForDisplay(targetDisplay.serial, 100, targetDisplay.adaptive);

    await showHUD(`🚀 ${targetDisplay.name}: Brightness to the max!`);
  } catch (error) {
    console.error("Failed to set max brightness:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Set Brightness",
      message: error instanceof Error ? error.message : "An error occurred",
    });
  }
}
