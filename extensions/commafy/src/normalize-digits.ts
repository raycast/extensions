import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { normalizeDigits } from "./lib/normalize-digits";

export default async function main(): Promise<void> {
  let selected: string;
  try {
    selected = await getSelectedText();
  } catch {
    await showHUD("⚠️ Could not read the selected text");
    return;
  }

  if (!selected) {
    await showHUD("⚠️ No text is selected");
    return;
  }

  const { text: transformed, count } = normalizeDigits(selected);

  if (transformed === selected) {
    await showHUD("No full-width characters found");
    return;
  }

  try {
    await Clipboard.paste(transformed);
    await showHUD(`✅ Normalized ${count} ${count === 1 ? "character" : "characters"}`);
  } catch {
    await Clipboard.copy(transformed);
    await showHUD("📋 Copied to clipboard (paste manually)");
  }
}
