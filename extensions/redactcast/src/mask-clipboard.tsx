import { Clipboard, LocalStorage, showHUD } from "@raycast/api";
import { maskText, DEFAULT_RULES, type Rule, type PersistedRule } from "./engine";

export default async function Command() {
  const clipboardText = await Clipboard.readText();
  if (!clipboardText) {
    await showHUD("Clipboard is empty or not text");
    return;
  }

  // Load team rules from LocalStorage
  const teamRulesStr = await LocalStorage.getItem<string>('team_rules');
  let customRules: Rule[] = [];
  
  if (teamRulesStr) {
    try {
      const parsed: PersistedRule[] = JSON.parse(teamRulesStr);
      customRules = parsed.map(r => ({
        id: r.id,
        // Reconstruct the RegExp from the string pattern
        pattern: new RegExp(r.patternSource, 'gi'),
        tokenType: r.tokenType
      }));
    } catch (e) {
      console.error("Failed to parse team rules", e);
    }
  }

  const mergedRules = [...customRules, ...DEFAULT_RULES];

  const { maskedText, mapping } = maskText(clipboardText, mergedRules);
  
  // Save mapping to LocalStorage
  // We overwrite the 'latest_mapping' for the MVP, assuming a linear workflow
  await LocalStorage.setItem('latest_mapping', JSON.stringify(mapping));
  
  await Clipboard.copy(maskedText);
  await showHUD("Clipboard Masked & Secured 🛡️");
}
