import { loadRules, saveRules, getDefaultBrowser } from "../storage";
import { Rule } from "../types";
import { generateFinickyConfig, writeConfigFile } from "../utils/finicky";
import { expandTilde } from "../utils/path";
import { getPreferenceValues } from "@raycast/api";

type Input = {
  /**
   * The ID or name of the rule to delete
   */
  ruleIdentifier: string;
};

async function syncConfigFile(args: { configPath: string; defaultBrowser: string; rules: Rule[] }) {
  const configPath = expandTilde(args.configPath);
  const contents = generateFinickyConfig({ defaultBrowser: args.defaultBrowser, rules: args.rules });
  await writeConfigFile({ configPath, configContents: contents });
}

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
  await saveRules(updatedRules);

  if (configPath) {
    await syncConfigFile({ configPath, defaultBrowser, rules: updatedRules });
  }

  return `✓ Successfully deleted rule "${ruleToDelete.name}"`;
}
