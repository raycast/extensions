import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { decommafy } from "./lib/decommafy";

export default async function main(): Promise<void> {
  const prefs = getPreferenceValues<Preferences.Decommafy>();

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

  const { text: transformed, count } = decommafy(selected, {
    separator: prefs.separator || ",",
  });

  if (transformed === selected) {
    await showHUD("No comma-formatted numbers found");
    return;
  }

  try {
    await Clipboard.paste(transformed);
    await showHUD(`✅ Decommafied ${count} ${count === 1 ? "number" : "numbers"}`);
  } catch {
    await Clipboard.copy(transformed);
    await showHUD("📋 Copied to clipboard (paste manually)");
  }
}
