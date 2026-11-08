import { loadRules, saveRules, getDefaultBrowser } from "../storage";
import { syncConfigFile, UnimportedRulesError } from "../utils/finicky";
import { getPreferenceValues } from "@raycast/api";

type Input = {
  /**
   * The ID or name of the rule to delete
   */
  ruleIdentifier: string;
};

/**
 * Delete a Finicky rule by ID or name
 */
export default async function tool(input: Input) {
  const preferences = getPreferenceValues<{ configPath?: string }>();
  const configPath = (preferences.configPath ?? "").trim();
  const defaultBrowser = await getDefaultBrowser();

  const rules = await loadRules();
  const ruleToDelete = rules.find(
    (r) => r.id === input.ruleIdentifier || r.name.toLowerCase().includes(input.ruleIdentifier.toLowerCase()),
  );

  if (!ruleToDelete) {
    return `❌ Rule not found: "${input.ruleIdentifier}". Use list-rules to see all available rules.`;
  }

  const updatedRules = rules.filter((r) => r.id !== ruleToDelete.id);
  if (configPath) {
    try {
      await syncConfigFile({
        configPath,
        defaultBrowser: defaultBrowser,
        rules: updatedRules,
        previousRuleCount: rules.length,
      });
    } catch (error) {
      if (error instanceof UnimportedRulesError) return `❌ ${error.message}`;
      throw error;
    }
  }
  await saveRules(updatedRules);

  return `✓ Successfully deleted rule "${ruleToDelete.name}"`;
}
