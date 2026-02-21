import { closeMainWindow, showHUD } from "@raycast/api";
import { getKeyboardBrightness, setKeyboardBrightness } from "./utils";

export default async function command() {
  try {
    await closeMainWindow();

    const brightness = await getKeyboardBrightness();

    if (brightness > 0) {
      await setKeyboardBrightness(0);
      await showHUD("Keyboard light off");
    } else {
      await setKeyboardBrightness(1);
      await showHUD("Keyboard light on");
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await showHUD(`Failed to toggle keyboard light: ${message}`);
  }
}
