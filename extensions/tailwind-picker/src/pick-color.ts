import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { toTailwind, pickColor } from "./utils";

export default async function command() {
  await closeMainWindow();

  try {
    const pickedColor = await pickColor();
    if (!pickedColor) return;

    // TODO: Add support for other color palettes such as Radix Colors etc
    const tw = toTailwind(pickedColor);

    await Clipboard.copy(tw);
    await showHUD(`✅ Copied ${tw} to clipboard!`);
  } catch (e) {
    console.error(e);
    await showHUD("❌ Failed picking color");
  }
}
