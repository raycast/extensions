import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { commafy } from "./lib/commafy";
import { normalizeDigits } from "./lib/normalize-digits";

export default async function main(): Promise<void> {
  const prefs = getPreferenceValues<Preferences.Commafy>();

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

  // Step 1: optionally normalize full-width digits (and numeric punctuation) before formatting.
  const normResult = prefs.normalizeFullWidth ? normalizeDigits(selected) : { text: selected, count: 0 };

  // Step 2: commafy.
  const { text: transformed, count: commaCount } = commafy(normResult.text, {
    minDigits: parseMinDigits(prefs.minDigits),
    separator: prefs.separator || ",",
    includeDecimals: prefs.includeDecimals,
    excludeYears: prefs.excludeYears,
    excludeHyphenated: prefs.excludeHyphenated,
  });

  if (transformed === selected) {
    await showHUD("No changes to apply");
    return;
  }

  await pasteOrCopy(transformed, buildHud(commaCount, normResult.count));
}

function parseMinDigits(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "4", 10);
  return Number.isFinite(n) && n >= 1 ? n : 4;
}

function buildHud(commaCount: number, normCount: number): string {
  const parts: string[] = [];
  if (commaCount > 0) {
    parts.push(`Commafied ${commaCount} ${commaCount === 1 ? "number" : "numbers"}`);
  }
  if (normCount > 0) {
    parts.push(`normalized ${normCount} ${normCount === 1 ? "character" : "characters"}`);
  }
  return parts.length > 0 ? `✅ ${parts.join(", ")}` : "✅ Updated";
}

/**
 * Attempt to paste into the focused field; if the host rejects paste
 * (read-only fields, secure inputs, etc.) fall back to copying the result
 * to the clipboard and prompting the user to paste manually.
 */
async function pasteOrCopy(text: string, successMessage: string): Promise<void> {
  try {
    await Clipboard.paste(text);
    await showHUD(successMessage);
  } catch {
    await Clipboard.copy(text);
    await showHUD("📋 Copied to clipboard (paste manually)");
  }
}
