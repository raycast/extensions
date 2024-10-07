import {
  closeMainWindow,
  LaunchProps,
  getPreferenceValues,
  showHUD,
  launchCommand,
  LaunchType,
  openCommandPreferences,
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

  await setAudioInputLevel(assignedLevel.toString());

  try {
    await launchCommand({ name: "mute-menu-bar", type: LaunchType.Background });
  } catch {
    console.log("mute-menu-bar command is not active");
  }
}
