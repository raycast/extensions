import { showHUD, updateCommandMetadata } from "@raycast/api";
import { stickiesWindowsCount } from "./applescript-utils";

export const showStickiesNotRunningHUD = async () => {
  await showHUD("📝 Stickies is not running");
};

export const updateStickiesWindowsCount = async () => {
  const windowCount = await stickiesWindowsCount();
  const subtitle = windowCount === 0 ? "Stickies" : `${windowCount} Stickies`;
  await updateCommandMetadata({ subtitle: subtitle });
};
