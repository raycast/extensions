import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { toggleLowPowerMode } from "./utils/powerManagement";
import { showFailureToast } from "@raycast/utils";

export default async function main(): Promise<void> {
  let lowPowerMode;

  try {
    lowPowerMode = await toggleLowPowerMode();
  } catch (error) {
    showFailureToast(error, { title: "Could not toggle low power mode" });
    return;
  }

  showHUD(`✅ Low power mode is turned ${lowPowerMode ? "on" : "off"}`);

  launchCommand({
    name: "lowpower-menubar",
    type: LaunchType.Background,
    context: { isEnabled: lowPowerMode },
  }).catch(() => {
    console.debug("low-power-menubar is disabled");
  });
}
