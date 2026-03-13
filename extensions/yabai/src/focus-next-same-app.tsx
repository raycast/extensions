import { closeMainWindow, showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { sortWindows, BaseWindow } from "./helpers/window-utils";

interface Window extends BaseWindow {
  "has-focus": boolean;
  "is-minimized": boolean;
}

export default async function Command() {
  try {
    const { stdout: windowsJson } = await runYabaiCommand("-m query --windows");
    const allWindows: Window[] = JSON.parse(windowsJson);

    const sortedWindows = sortWindows(allWindows);

    const currentWindow = sortedWindows.find((w) => w["has-focus"]);
    if (!currentWindow) {
      await showHUD("No focused window found");
      return;
    }

    const sameAppWindows = sortedWindows.filter((w) => w.app === currentWindow.app);
    if (sameAppWindows.length <= 1) {
      await showHUD("No other windows of the same app");
      return;
    }

    const currentIndex = sameAppWindows.findIndex((w) => w.id === currentWindow.id);
    const nextIndex = (currentIndex + 1) % sameAppWindows.length;
    const nextWindow = sameAppWindows[nextIndex];

    await runYabaiCommand(`-m window --focus ${nextWindow.id}`);
    if (nextWindow["is-minimized"]) {
      await runYabaiCommand(`-m window ${nextWindow.id} --deminimize`);
    }

    await showHUD(`Focused ${nextWindow.app}`);
    await closeMainWindow();
  } catch (error) {
    console.error("Error:", error);
    await showHUD("Failed to focus next window");
  }
}
