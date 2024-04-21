import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { PowerMode, PowerModeTarget, setPowerMode } from "./utils/powerManagement";
import { showFailureToast } from "@raycast/utils";

export default async function main(): Promise<void> {
  try {
    await setPowerMode(PowerMode.Low, PowerModeTarget.All);
  } catch (error) {
    await showFailureToast(error, { title: "Could not enable low power mode" });
    return;
  }

  await showHUD("✅ Low power mode is enabled");

  try {
    launchCommand({
      name: "lowpower-menubar",
      type: LaunchType.Background,
      context: { isEnabled: true },
    });
  } catch {
    console.debug("low-power-menubar is disabled");
  }
}
