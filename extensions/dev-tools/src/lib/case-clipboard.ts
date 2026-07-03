import { Clipboard, showHUD } from "@raycast/api";

/**
 * Shared body for the no-view case-conversion shortcuts: read the clipboard,
 * apply a pure-text `transform`, write the result back, and report via HUD.
 * Unlike the other clipboard helpers this does NOT trim — case conversion must
 * preserve the text's surrounding whitespace and newlines exactly.
 */
export async function transformCase(label: string, transform: (text: string) => string): Promise<void> {
  const clipboard = await Clipboard.readText();
  if (!clipboard) {
    await showHUD("❌ Clipboard is empty");
    return;
  }
  await Clipboard.copy(transform(clipboard));
  await showHUD(`✅ ${label}`);
}
