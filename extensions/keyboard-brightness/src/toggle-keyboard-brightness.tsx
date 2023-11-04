import { LocalStorage } from "@raycast/api";
import { closeMainWindow, showHUD } from "@raycast/api";
import executeCommand from "./utils";
import { GetBrightness } from "./types";

export default async function command() {
  await closeMainWindow();

  try {
    const { stdout } = await executeCommand(["get"]);
    const { brightness } = JSON.parse(stdout) as GetBrightness;
    let storedBrightness = await LocalStorage.getItem<number>("brightness");

    if (brightness > 0) {
      await LocalStorage.setItem("brightness", brightness);
      await executeCommand(["set", "0"]);
    } else {
      storedBrightness = storedBrightness !== null ? storedBrightness : 1;
      await executeCommand(["set", String(storedBrightness)]);
    }
    await showHUD("✅ Toggled Keyboard Brightness");
  } catch (e) {
    console.error(e);
    await showHUD("❌ Failed Toggling Keyboard Brigthness");
  }
}
