import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { PowerMode, PowerModeTarget, setPowerMode } from "./utils/powerManagement";
import { showFailureToast } from "@raycast/utils";

export default async function main(): Promise<void> {
  try {
    await setPowerMode(PowerMode.Low, PowerModeTarget.All);
  } catch (error) {
    showFailureToast(error, { title: "Could not enable low power mode" });
    return;
  }

  showHUD("✅ Low power mode is enabled");

  launchCommand({
    name: "lowpower-menubar",
    type: LaunchType.Background,
    context: { isEnabled: true },
  }).catch(() => {
    console.debug("low-power-menubar is disabled");
  });
}
