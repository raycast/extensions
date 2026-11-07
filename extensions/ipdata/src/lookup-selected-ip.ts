import { Clipboard, getSelectedText } from "@raycast/api";
import { quickLookup } from "./lib/quick";

// The desktop counterpart of the Chrome extension's hover and select triggers: select an IP in
// any app, press the command's hotkey, and the result appears as a HUD. Falls back to the
// clipboard when nothing is selected (some apps do not expose their selection).
export default async function Command() {
  let text = "";
  try {
    text = await getSelectedText();
  } catch {
    /* no selection, or the frontmost app does not expose it */
  }
  if (text.trim()) {
    await quickLookup(text, "selected text");
    return;
  }
  const clipboard = (await Clipboard.readText()) ?? "";
  await quickLookup(clipboard, "selection or clipboard");
}
