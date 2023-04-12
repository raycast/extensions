import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { toRadix } from "./radix";
import { pickColor } from "./utils";

export default async function command() {
  await closeMainWindow();

  try {
    const pickedColor = await pickColor();
    if (!pickedColor) return;

    const radix = toRadix(pickedColor);

    await Clipboard.copy(radix);
    await showHUD(`✅ Copied ${radix} to clipboard!`);
  } catch (e) {
    console.error(e);
    await showHUD("❌ Failed picking color");
  }
}
