import { showHUD, showToast, Toast, LaunchProps } from "@raycast/api";
import {
  ensureLunarReady,
  getDisplays,
  getCursorDisplay,
  getBrightnessForDisplay,
  setBrightnessForDisplay,
} from "./utils/lunar";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SetBrightness }>) {
  const { level: levelArg } = props.arguments;

  // Validate brightness level
  const brightnessLevel = parseInt(levelArg, 10);

  if (isNaN(brightnessLevel)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Input",
      message: "Please enter a number between 1 and 100",
    });
    return;
  }

  if (brightnessLevel < 1 || brightnessLevel > 100) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Out of Range",
      message: "Brightness must be between 1 and 100",
    });
    return;
  }

  if (!(await ensureLunarReady())) {
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

    // Auto-detect cursor display, fallback to main display
    const cursorDisplaySerial = await getCursorDisplay();
    let targetDisplay = allDisplays.find((d) => d.serial === cursorDisplaySerial);

    if (!targetDisplay) {
      targetDisplay = allDisplays.find((d) => d.main) || allDisplays[0];
    }

    // Get current brightness for the HUD message
    const currentBrightness = await getBrightnessForDisplay(targetDisplay.serial);

    await setBrightnessForDisplay(targetDisplay.serial, brightnessLevel, targetDisplay.adaptive);

    // Show result
    if (currentBrightness !== null) {
      await showHUD(`${targetDisplay.name}: ${currentBrightness}% → ${brightnessLevel}%`);
    } else {
      await showHUD(`${targetDisplay.name}: Set to ${brightnessLevel}%`);
    }
  } catch (error) {
    console.error("Failed to set brightness:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Set Brightness",
      message: error instanceof Error ? error.message : "An error occurred",
    });
  }
}
