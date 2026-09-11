import { showHUD, showToast, Toast, LaunchProps } from "@raycast/api";
import { setBrightness } from "./utils/platform";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SetBrightness }>) {
  const { level: levelArg } = props.arguments;
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

  try {
    const result = await setBrightness(brightnessLevel);
    if (!result) return;

    const currentBrightness = result.brightness ?? brightnessLevel;
    if (result.displayName && result.previousBrightness != null) {
      await showHUD(`${result.displayName}: ${result.previousBrightness}% → ${currentBrightness}%`);
    } else {
      await showHUD(`Brightness set to ${currentBrightness}%`);
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
