import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { PowerMode, PowerModeTarget, setPowerMode } from "./utils/powerManagement";
import { showFailureToast } from "@raycast/utils";

export default async function main(): Promise<void> {
  try {
    await setPowerMode(PowerMode.Normal, PowerModeTarget.All);
  } catch (error) {
    showFailureToast(error, { title: "Could not disable low power mode" });
    return;
  }

  showHUD("✅ Low power mode is disabled");

  launchCommand({
    name: "lowpower-menubar",
    type: LaunchType.Background,
    context: { isEnabled: false },
  }).catch(() => {
    console.debug("low-power-menubar is disabled");
  });
}
