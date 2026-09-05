import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { toggleMenuBarVisibility } from "./menu-bar-visibility-store";

export default async function Command() {
  let isVisible: boolean;

  try {
    isVisible = await toggleMenuBarVisibility();
  } catch {
    await showHUD("Could not update the menu-bar setting");
    return;
  }

  try {
    await launchCommand({ name: "reset-forecast-menu-bar", type: LaunchType.Background });
  } catch {
    await showHUD(
      isVisible ? "Enable the menu-bar command in Raycast Settings" : "Reset forecast hidden from menu bar",
    );
    return;
  }

  await showHUD(isVisible ? "Reset forecast shown in menu bar" : "Reset forecast hidden from menu bar");
}
