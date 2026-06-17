import { Clipboard, closeMainWindow, Detail, LaunchProps, popToRoot, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { callbackLaunchCommand, LaunchOptions } from "raycast-cross-extension";
import { useEffect, useRef } from "react";
import { addToHistory } from "./lib/history";
import { Color } from "./lib/types";
import { getFormattedColor, isMac } from "./lib/utils";

export default function Command({
  launchContext = {},
}: LaunchProps<{
  launchContext?: {
    copyToClipboard?: boolean;
    callbackLaunchOptions?: LaunchOptions;
  };
}>) {
  const hasInitialized = useRef(false);
  useEffect(() => {
    async function pickAndHandleColor() {
      try {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        let pickColor: () => Promise<Color | null | undefined>;
        if (isMac) {
          const { pickColor: pickColorSwift } = await import("swift:../swift/color-picker");
          pickColor = pickColorSwift;
        } else {
          const { pick_color: pickColorRust } = await import("rust:../rust/color-picker");
          // colorSpace is accessible in runtime, but typescript definitions are generated wrong by raycast/api
          // hopefully will be fixed in future versions of raycast/api
          pickColor = pickColorRust as () => Promise<Color | null | undefined>;
        }
        const pickedColor = await pickColor();
        if (!pickedColor) {
          return;
        }

        addToHistory(pickedColor);

        const hex = getFormattedColor(pickedColor, "hex");
        const formattedColor = getFormattedColor(pickedColor);
        if (!formattedColor) {
          throw new Error("Failed to format color");
        }

        if (launchContext?.callbackLaunchOptions) {
          if (launchContext.copyToClipboard) {
            await Clipboard.copy(formattedColor);
          }
          try {
            await callbackLaunchCommand(launchContext.callbackLaunchOptions, { hex, formattedColor });
          } catch (e) {
            await showFailureToast(e);
          }
        } else {
          await Clipboard.copy(formattedColor);
          await showHUD(`Copied color ${formattedColor} to clipboard`);
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
