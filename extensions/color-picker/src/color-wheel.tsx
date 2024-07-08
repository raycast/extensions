import { Detail, showHUD, Clipboard, popToRoot, closeMainWindow } from "@raycast/api";
import { useEffect } from "react";
import { addToHistory } from "./history";
import { Color } from "./types";
import { getFormattedColor } from "./utils";
import { pickColor } from "swift:../swift/color-picker";

export default function Command() {
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

        await Clipboard.copy(hex);
        await showHUD(`Copied color ${hex} to clipboard`);

        await closeMainWindow();
        await popToRoot();
      } catch (e) {
        console.error(e);
        await showHUD("❌ Failed picking color");
      }
    }

    pickAndHandleColor();
  }, []);

  return <Detail markdown={`![RGB Color Wheel](rgb-color-wheel.webp?raycast-width=350&raycast-height=350)`} />;
}
