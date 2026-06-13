import { Clipboard, LocalStorage, showHUD } from "@raycast/api";
import {
  maskText,
  DEFAULT_RULES,
  type Rule,
  type PersistedRule
} from "./engine";

// Basic regex validation to prevent ReDoS from malicious API responses.
// This rejects patterns with nested quantifiers like (a+)+ or excessive repetitions.
function isSafeRegex(patternStr: string): boolean {
  // Reject obviously dangerous patterns: nested quantifiers, excessive lookarounds
  const dangerousPatterns = [
    /(\([^)]+\)\+)\+/, // (a+)+
    /(\([^)]+\)\*)\*/, // (a*)*
    /(\([^)]+\)\+)\*/, // (a+)*
    /(\([^)]+\)\*)\+/, // (a*)+
    /\{[0-9]+,\s*[0-9]*\}\+/, // {x,y}+
    /\(\?=/ // Excessive positive lookahead (can be slow)
  ];
  return !dangerousPatterns.some(regex => regex.test(patternStr));
}

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
      customRules = parsed
        .map(r => {
          if (!isSafeRegex(r.patternSource)) {
            console.warn(
              "Skipping unsafe regex pattern from API:",
              r.patternSource
            );
            return null;
          }
          try {
            return {
              id: r.id,
              pattern: new RegExp(r.patternSource, "gi"),
              tokenType: r.tokenType
            };
          } catch (e) {
            console.warn("Invalid regex pattern from API:", r.patternSource);
            return null;
          }
        })
        .filter(r => r !== null) as Rule[];
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
