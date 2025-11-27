import { runAppleScript } from "@raycast/utils";

/**
 * Open a new tab in Dia with a specific URL
 */
export async function openNewTab(url: string): Promise<void> {
  await runAppleScript(`
    tell application "Dia"
      activate
      open location "${url}"
    end tell
    return true
  `);
}
