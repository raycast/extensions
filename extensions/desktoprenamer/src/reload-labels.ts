import { showHUD } from "@raycast/api";
import { runDesktopRenamerScript } from "./utils";

export default async function Command() {
  try {
    await runDesktopRenamerScript(`
      tell application "DesktopRenamer"
        reload space labels
      end tell
    `);
    await showHUD("Labels reloaded");
  } catch {
    // Error handled by utils
  }
}
