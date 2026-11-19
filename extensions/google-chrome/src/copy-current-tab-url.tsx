import { Clipboard, showHUD } from "@raycast/api";
import { getActiveTabURL } from "./actions";

export default async function Command() {
  try {
    const url = await getActiveTabURL();
    if (!url) {
      await showHUD("No active tab URL found to copy");
      return;
    }

    await Clipboard.copy(url);
    await showHUD("Copied tab URL to clipboard");
  } catch {
    await showHUD("❌ Failed copying current tab URL");
  }
}
