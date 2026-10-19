import { Clipboard, showHUD } from "@raycast/api";
import { CHROME, frontChromeWindowId, osascript } from "./chrome";

export default async function Command() {
  try {
    const id = await frontChromeWindowId();
    if (!id) return showHUD("Chrome is not frontmost");
    const url = await osascript(`tell application "${CHROME}" to return URL of active tab of window id ${id}`);
    await Clipboard.copy(url);
    await showHUD(`Copied ${url}`);
  } catch (e) {
    await showHUD(`Copy URL failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
