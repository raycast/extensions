import {
  closeMainWindow,
  LaunchProps,
  getPreferenceValues,
  showHUD,
  launchCommand,
  LaunchType,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { setAudioInputLevel } from "./utils";

export default async function setLevel(props: LaunchProps<{ arguments: Arguments.SetLevel }>) {
  await closeMainWindow();
  let level = 0;
  const defaultLevel = Number(getPreferenceValues<Preferences.SetLevel>()["default-level"]);
  let assignedLevel = 0;

  if (props.arguments.level.length !== 0) {
    level = Number(props.arguments.level);

    if (isNaN(level) || 0 > level || level > 100) {
      await showHUD("❌ Level must be a number between 0 and 100");
      return;
    }

    assignedLevel = level;
  } else {
    if (isNaN(defaultLevel) || 0 > defaultLevel || defaultLevel > 100) {
      await showHUD("❌ Default level must be a number between 0 and 100");
      openCommandPreferences();
      return;
    }
    assignedLevel = defaultLevel;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Setting audio input…`,
  });
  try {
    await setAudioInputLevel(assignedLevel.toString());
    toast.style = Toast.Style.Success;
    toast.title = `Audio input set to ${assignedLevel.toString()}`;
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to set the input level";
  }

  // showHUD(`Audio input set to ${assignedLevel.toString()}`);
  try {
    await launchCommand({ name: "mute-menu-bar", type: LaunchType.Background });
  } catch {
    console.log("mute-menu-bar command is not active");
  }
}
