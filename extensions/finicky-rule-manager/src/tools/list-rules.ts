import { loadRules } from "../storage";

/**
 * List all Finicky rules with their details including name, patterns, browser, and enabled status
 */
export default async function tool() {
  const rules = await loadRules();

  if (rules.length === 0) {
    return "No rules found. You can create a new rule by describing what you want.";
  }

  const rulesList = rules
    .map((rule, index) => {
      const status = rule.enabled ? "✓ Enabled" : "✗ Disabled";
      const patterns = rule.patterns.join(", ");
      return `${index + 1}. ${rule.name} (${status})
   - Match Type: ${rule.matchType}
   - Patterns: ${patterns}
   - Browser: ${rule.browser}
   - ID: ${rule.id}`;
    })
    .join("\n\n");

  return `Found ${rules.length} rule(s):\n\n${rulesList}`;
}
