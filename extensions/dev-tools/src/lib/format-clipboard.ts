import { Clipboard, showHUD } from "@raycast/api";

/**
 * Shared body for the no-view JSON shortcut commands: read the clipboard, run a
 * pure-text `transform`, write the result back, and report via HUD. Mirrors
 * convert-clipboard.ts for the number tools.
 */
export async function transformClipboard(label: string, transform: (text: string) => string): Promise<void> {
  const clipboard = (await Clipboard.readText())?.trim();
  if (!clipboard) {
    await showHUD("❌ Clipboard is empty");
    return;
  }
  try {
    await Clipboard.copy(transform(clipboard));
    await showHUD(`✅ ${label}`);
  } catch (error) {
    await showHUD(`❌ ${error instanceof Error ? error.message : String(error)}`);
  }
}
