import { getPreferenceValues, showToast, Toast, LaunchProps } from "@raycast/api";
import { setBrightness } from "./utils/platform";
import { showBrightnessFeedback } from "./utils/feedback";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SetBrightness }>) {
  const { level: levelArg } = props.arguments;
  const { closeRaycast = true, showDisplayName = true } = getPreferenceValues<Preferences.SetBrightness>();
  const brightnessLevel = parseInt(levelArg, 10);

  if (isNaN(brightnessLevel)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Input",
      message: "Please enter a number between 0 and 100",
    });
    return;
  }

  if (brightnessLevel < 0 || brightnessLevel > 100) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Out of Range",
      message: "Brightness must be between 0 and 100",
    });
    return;
  }

  try {
    const result = await setBrightness(brightnessLevel);
    if (!result) return;

    const currentBrightness = result.brightness ?? brightnessLevel;
    const message =
      showDisplayName && result.displayName && result.previousBrightness != null
        ? `${result.displayName}: ${result.previousBrightness}% → ${currentBrightness}%`
        : `Brightness set to ${currentBrightness}%`;
    await showBrightnessFeedback(message, closeRaycast);
  } catch (error) {
    console.error("Failed to set brightness:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Set Brightness",
      message: error instanceof Error ? error.message : "An error occurred",
    });
  }
}
