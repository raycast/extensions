import { Clipboard, LocalStorage, showHUD } from "@raycast/api";
import { maskText, compileLiteralRule, DEFAULT_RULES, type Rule, type PersistedRule } from "./engine";

export default async function Command() {
  const clipboardText = await Clipboard.readText();
  if (!clipboardText) {
    await showHUD("Clipboard is empty or not text");
    return;
  }

  const teamRulesStr = await LocalStorage.getItem<string>("team_rules");
  let customRules: Rule[] = [];

  if (teamRulesStr) {
    try {
      const parsed: PersistedRule[] = JSON.parse(teamRulesStr);
      // Team rules match literal strings, so no remote input is ever compiled
      // as a regex — see compileLiteralRule in engine.ts.
      customRules = parsed.map(compileLiteralRule).filter((r): r is Rule => r !== null);
    } catch (e) {
      console.error("Failed to parse team rules", e);
    }
  }

  const mergedRules = [...customRules, ...DEFAULT_RULES];

  const { maskedText, mapping } = maskText(clipboardText, mergedRules);

  await LocalStorage.setItem("latest_mapping", JSON.stringify(mapping));

  await Clipboard.copy(maskedText);
  await showHUD("Clipboard Masked & Secured 🛡️");
}
