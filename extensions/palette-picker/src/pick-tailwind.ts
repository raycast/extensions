import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { toTailwind } from "./tailwind";
import { pickColor } from "./utils";

export default async function command() {
  await closeMainWindow();

  try {
    const pickedColor = await pickColor();
    if (!pickedColor) return;

    const tw = toTailwind(pickedColor);

    await Clipboard.copy(tw);
    await showHUD(`✅ Copied ${tw} to clipboard!`);
  } catch (e) {
    console.error(e);
    await showHUD("❌ Failed picking color");
  }
}
