import { runAppleScript } from "@raycast/utils";

/**
 * Open a new tab in Dia with a specific URL
 */
export async function openNewTab(url: string): Promise<void> {
  // Escape double quotes and backslashes for AppleScript string safety
  const escapedUrl = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  await runAppleScript(`
    tell application "Dia"
      activate
      open location "${escapedUrl}"
    end tell
    return true
  `);
}
