import { Clipboard, closeMainWindow, Detail, LaunchProps, popToRoot, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { callbackLaunchCommand, LaunchOptions } from "raycast-cross-extension";
import { useEffect } from "react";
import { pickColor } from "swift:../swift/color-picker";
import { addToHistory } from "./history";
import { Color } from "./types";
import { getFormattedColor } from "./utils";

export default function Command({
  launchContext = {},
}: LaunchProps<{
  launchContext?: {
    copyToClipboard?: boolean;
    callbackLaunchOptions?: LaunchOptions;
  };
}>) {
  useEffect(() => {
    async function pickAndHandleColor() {
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

        if (launchContext?.callbackLaunchOptions) {
          if (launchContext.copyToClipboard) {
            await Clipboard.copy(hex);
          }
          try {
            await callbackLaunchCommand(launchContext.callbackLaunchOptions, { hex });
          } catch (e) {
            await showFailureToast(e);
          }
        } else {
          await Clipboard.copy(hex);
          await showHUD(`Copied color ${hex} to clipboard`);
          await closeMainWindow();
          await popToRoot();
        }
      } catch (e) {
        console.error(e);
        await showHUD("❌ Failed picking color");
      }
    }

    pickAndHandleColor();
  }, []);

  return <Detail markdown="![RGB Color Wheel](rgb-color-wheel.webp?&raycast-height=350)" />;
}
