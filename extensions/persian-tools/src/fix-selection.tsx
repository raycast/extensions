import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { fixLayout } from "./lib/layout";

export default async function Command() {
  try {
    const text = await getSelectedText();
    if (!text || text.trim().length === 0) {
      await showHUD("No text selected");
      return;
    }
    await Clipboard.paste(fixLayout(text));
    await showHUD("Layout fixed");
  } catch {
    await showHUD("No text selected");
  }
}
