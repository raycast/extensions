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

    let newBrightness: number;
    if (brightness! > 0) {
      await setStoredBrightness(brightness!);
      newBrightness = 0;
    } else {
      const storedBrightness = await getStoredBrightness();
      newBrightness = storedBrightness ?? 1;
    }

    await setSystemBrightness(newBrightness!);
    await showHUD(`Keyboard Brightness set to ${(newBrightness! * 100).toFixed(0)}%`);
  } catch (e) {
    console.error(e);
    await showHUD("❌ Failed Toggling Keyboard Brightness");
  }
}
