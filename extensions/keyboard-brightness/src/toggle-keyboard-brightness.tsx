import { closeMainWindow, showHUD } from "@raycast/api";
import {
  getStoredBrightness,
  getSystemBrightness,
  setStoredBrightness,
  setSystemBrightness,
} from "./utils";

export default async function command() {
  await closeMainWindow();

  try {
    const brightness = await getSystemBrightness();
    let storedBrightness = await getStoredBrightness();

    if (brightness! > 0) {
      await setStoredBrightness(brightness!);
      await setSystemBrightness(0);
    } else {
      storedBrightness = storedBrightness !== null ? storedBrightness : 1;
      await setSystemBrightness(storedBrightness!);
    }
    await showHUD("✅ Toggled Keyboard Brightness");
  } catch (e) {
    console.error(e);
    await showHUD("❌ Failed Toggling Keyboard Brightness");
  }
}
