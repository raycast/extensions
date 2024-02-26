import { Clipboard, closeMainWindow, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { addToHistory } from "./history";
import { Color, PickColorCommandLaunchProps } from "./types";
import { getFormattedColor } from "./utils";
import { pickColor } from "swift:../swift/color-picker";
import { showFailureToast } from "@raycast/utils";

export default async function command(props: PickColorCommandLaunchProps) {
  await closeMainWindow();

  try {
    const pickedColor = (await pickColor()) as Color | undefined;
    if (!pickedColor) {
      return;
    }

    addToHistory(pickedColor);

    const hex = getFormattedColor(pickedColor);
    if (!hex) {
      throw new Error("Failed to format color");
    }

    await Clipboard.copy(hex);

    await showHUD(`Copied color ${hex} to clipboard`);
    try {
      await launchCommand({ name: "menu-bar", type: LaunchType.Background });
    } catch (e) {
      await showFailureToast(e);
      console.error("Menu bar command failed to launch.");
    }

    if (props.launchContext?.source === "organize-colors") {
      try {
        await launchCommand({ name: "organize-colors", type: LaunchType.UserInitiated });
      } catch (e) {
        await showFailureToast(e);
        console.error("Menu bar command failed to launch.");
      }
    }
  } catch (e) {
    console.error(e);

    await showHUD("❌ Failed picking color");
  }
}
