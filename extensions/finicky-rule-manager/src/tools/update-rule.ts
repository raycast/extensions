import { loadRules, saveRules, getDefaultBrowser } from "../storage";
import { syncConfigFile, UnimportedRulesError } from "../utils/finicky";
import { getPreferenceValues } from "@raycast/api";

type Input = {
  /**
   * The ID or name of the rule to update
   */
  ruleIdentifier: string;

  /**
   * New name for the rule (optional)
   */
  name?: string;

  /**
   * New patterns as a comma-separated or newline-separated string (optional)
   */
  patterns?: string;

  /**
   * New browser (optional)
   */
  browser?: string;

  /**
   * Enable or disable the rule (optional)
   */
  enabled?: boolean;
};

function parsePatterns(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
}

/**
 * Update an existing Finicky rule's properties
 */
export default async function tool(input: Input) {
  const preferences = getPreferenceValues<{ configPath?: string }>();
  const configPath = (preferences.configPath ?? "").trim();
  const defaultBrowser = await getDefaultBrowser();

  const rules = await loadRules();
  const ruleIndex = rules.findIndex(
    (r) => r.id === input.ruleIdentifier || r.name.toLowerCase().includes(input.ruleIdentifier.toLowerCase()),
  );

  if (ruleIndex === -1) {
    return `❌ Rule not found: "${input.ruleIdentifier}". Use list-rules to see all available rules.`;
  }

  const rule = rules[ruleIndex];
  const updates: string[] = [];

  if (input.name !== undefined) {
    rule.name = input.name;
    updates.push(`name → "${input.name}"`);
  }

  if (input.patterns !== undefined) {
    const patterns = parsePatterns(input.patterns);
    if (patterns.length === 0) {
      return "❌ Please provide at least one URL pattern when updating patterns.";
    }
    rule.patterns = patterns;
    updates.push(`patterns → ${patterns.join(", ")}`);
  }

  if (input.browser !== undefined) {
    rule.browser = input.browser;
    updates.push(`browser → ${input.browser}`);
  }

  if (input.enabled !== undefined) {
    rule.enabled = input.enabled;
    updates.push(`status → ${input.enabled ? "Enabled" : "Disabled"}`);
  }

  rules[ruleIndex] = rule;
  if (configPath) {
    try {
      await syncConfigFile({ configPath, defaultBrowser: defaultBrowser, rules, previousRuleCount: rules.length });
    } catch (error) {
      if (error instanceof UnimportedRulesError) return `❌ ${error.message}`;
      throw error;
    }
  }
  await saveRules(rules);

  return `✓ Successfully updated rule "${rule.name}"\nChanges:\n${updates.map((u) => `- ${u}`).join("\n")}`;
}
