import { Clipboard, closeMainWindow, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { callbackLaunchCommand } from "raycast-cross-extension";
import { pickColor } from "swift:../swift/color-picker";
import { addToHistory } from "./history";
import { Color, PickColorCommandLaunchProps } from "./types";
import { getFormattedColor } from "./utils";

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

    if (props.launchContext?.callbackLaunchOptions) {
      if (props.launchContext?.copyToClipboard) {
        await Clipboard.copy(hex);
      }

      try {
        await callbackLaunchCommand(props.launchContext.callbackLaunchOptions, { hex });
      } catch (e) {
        await showFailureToast(e);
      }
    } else {
      await Clipboard.copy(hex);
      await showHUD(`Copied color ${hex} to clipboard`);
    }

    try {
      await launchCommand({ name: "menu-bar", type: LaunchType.Background });
    } catch (e) {
      if (!(e instanceof Error && e.message.includes("must be activated"))) {
        await showFailureToast(e);
      }
    }

    if (props.launchContext?.source === "organize-colors") {
      try {
        await launchCommand({ name: "organize-colors", type: LaunchType.UserInitiated });
      } catch (e) {
        await showFailureToast(e);
      }
    }
  } catch (e) {
    console.error(e);

    await showHUD("❌ Failed picking color");
  }
}
