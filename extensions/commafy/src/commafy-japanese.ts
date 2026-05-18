import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { formatWithJapaneseUnits } from "./lib/japanese-units";
import { normalizeDigits } from "./lib/normalize-digits";

export default async function main(): Promise<void> {
  const prefs = getPreferenceValues<Preferences.CommafyJapanese>();

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

  const normResult = prefs.normalizeFullWidth ? normalizeDigits(selected) : { text: selected, count: 0 };

  const { text: transformed, count: unitCount } = formatWithJapaneseUnits(normResult.text, {
    withInternalCommas: prefs.withInternalCommas,
    excludeYears: prefs.excludeYears,
    excludeHyphenated: prefs.excludeHyphenated,
  });

  if (transformed === selected) {
    await showHUD("No changes to apply");
    return;
  }

  await pasteOrCopy(transformed, buildHud(unitCount, normResult.count));
}

function buildHud(unitCount: number, normCount: number): string {
  const parts: string[] = [];
  if (unitCount > 0) {
    parts.push(`Formatted ${unitCount} ${unitCount === 1 ? "number" : "numbers"} with 万/億`);
  }
  if (normCount > 0) {
    parts.push(`normalized ${normCount} ${normCount === 1 ? "character" : "characters"}`);
  }
  return parts.length > 0 ? `✅ ${parts.join(", ")}` : "✅ Updated";
}

async function pasteOrCopy(text: string, successMessage: string): Promise<void> {
  try {
    await Clipboard.paste(text);
    await showHUD(successMessage);
  } catch {
    await Clipboard.copy(text);
    await showHUD("📋 Copied to clipboard (paste manually)");
  }
}
