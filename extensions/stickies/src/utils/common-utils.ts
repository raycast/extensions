import { showHUD, updateCommandMetadata } from "@raycast/api";
import { getStickiesNotesCount } from "./stickies-utils";

export const showStickiesNotRunningHUD = async () => {
  await showHUD("📝 Stickies is not running");
};

export const updateStickiesWindowsCount = async () => {
  const windowCount = await getStickiesNotesCount();
  const subtitle = windowCount === 0 ? "Stickies" : `${windowCount} Stickies`;
  await updateCommandMetadata({ subtitle: subtitle });
};
