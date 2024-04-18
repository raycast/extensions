import { LaunchType, launchCommand } from "@raycast/api";
import { toggleLowPowerMode } from "./utils/powerManagement";

export default async function main(fromMenubar: boolean) {
  await toggleLowPowerMode();
  try {
    await launchCommand({ name: "lowpower-menubar", type: LaunchType.Background });
  } catch {
    if (!fromMenubar) console.log("lowpower-menubar command is not active");
  }
}
