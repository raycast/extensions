import { closeMainWindow, Detail, LaunchProps, popToRoot, showHUD } from "@raycast/api";
import { LaunchOptions } from "raycast-cross-extension";
import { useEffect, useRef } from "react";
import { pickAndHandleColor } from "./lib/pick-color";

const COLOR_WHEEL_MARKDOWN = "![RGB Color Wheel](rgb-color-wheel.png)";

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
    async function pickFromWheel() {
      try {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const outcome = await pickAndHandleColor({ launchContext });
        if (outcome === "copied") {
          await closeMainWindow();
          await popToRoot();
        }
      } catch (e) {
        console.error(e);
        await showHUD("❌ Failed picking color");
      }
    }

    pickFromWheel();
  }, []);

  return <Detail markdown={COLOR_WHEEL_MARKDOWN} />;
}
