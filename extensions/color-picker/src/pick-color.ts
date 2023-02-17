import { Clipboard, closeMainWindow, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { addToHistory } from "./history";
import { PickColorCommandLaunchProps } from "./types";
import { getFormattedColor, pickColor } from "./utils";

export default async function command(props: PickColorCommandLaunchProps) {
  await closeMainWindow();

  try {
    const pickedColor = await pickColor();
    if (!pickedColor) {
      return;
    }

    addToHistory(pickedColor);

    const hex = getFormattedColor(pickedColor);
    await Clipboard.copy(hex);

    await showHUD("Copied color to clipboard");
    try {
      await launchCommand({ name: "menu-bar", type: LaunchType.Background });
    } catch (e) {
      console.error("Menu bar command failed to launch.");
    }

    if (props.launchContext?.source === "organize-colors") {
      await launchCommand({ name: "organize-colors", type: LaunchType.UserInitiated });
    }
  } catch (e) {
    console.error(e);

    await showHUD("❌ Failed picking color");
  }
}
