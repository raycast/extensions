import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { fixLayout } from "./lib/layout";

export default async function Command() {
  let text: string;
  try {
    text = await getSelectedText();
  } catch {
    await showHUD("No text selected");
    return;
  }
  if (text.trim().length === 0) {
    await showHUD("No text selected");
    return;
  }

  try {
    await Clipboard.paste(fixLayout(text));
    await showHUD("Layout fixed");
  } catch {
    await showHUD("Could not paste the converted text");
  }
}
