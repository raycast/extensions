import { LaunchType, closeMainWindow, getPreferenceValues, launchCommand } from "@raycast/api";
import { get, toggleFnFactory } from "./utils";

type Preferences = {
  keepPreviousInputVolume: boolean;
};

export default async function toggleMute() {
  const preferences: Preferences = getPreferenceValues();
  const toggle = toggleFnFactory(preferences);
  const currentAudioInputLevel = await get();
  await closeMainWindow();
  await toggle(Number(currentAudioInputLevel));

  try {
    await launchCommand({ name: "mute-menu-bar", type: LaunchType.Background });
  } catch {
    console.log("mute-menu-bar command is not active");
  }
}
