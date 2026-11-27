import { LaunchProps, showHUD } from "@raycast/api";
import { killStrayOverlays } from "./lib/highlight";
import { getScreenshotPreferences } from "./lib/preferences";
import { enumerateScreens, screenUnderMouse } from "./lib/screens";
import { captureAndPaste, screenshotFlowErrorMessage } from "./lib/screenshot-flow";

export default async function Command({ launchContext }: LaunchProps<{ launchContext: { displayNumber?: number } }>) {
  try {
    await killStrayOverlays();
    const preferences = getScreenshotPreferences();
    const screens = await enumerateScreens();
    const screen =
      screens.find(({ displayNumber }) => displayNumber === launchContext?.displayNumber) ?? screenUnderMouse(screens);
    await captureAndPaste(screen, preferences);
  } catch (error) {
    await showHUD(screenshotFlowErrorMessage(error));
  }
}
