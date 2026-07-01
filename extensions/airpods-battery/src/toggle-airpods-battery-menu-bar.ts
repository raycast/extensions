import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { isMenuBarVisible, toggleMenuBarVisible } from "./visibility";

export default async function Command() {
  const wasVisible = await isMenuBarVisible();
  const isVisible = await toggleMenuBarVisible();

  await launchCommand({ name: "airpods-battery", type: LaunchType.Background });

  if (wasVisible && !isVisible) {
    await showHUD("AirPods Battery hidden", { clearRootSearch: true });
    return;
  }

  await showHUD("AirPods Battery shown", { clearRootSearch: true });
}
