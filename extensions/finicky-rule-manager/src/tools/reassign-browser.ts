import { loadRules, saveRules, getDefaultBrowser, setDefaultBrowser } from "../storage";
import { syncConfigFile, UnimportedRulesError } from "../utils/finicky";
import { reassignBrowser, sameBrowser, browserUsage } from "../utils/reassign";
import { getPreferenceValues, Tool } from "@raycast/api";

type Input = {
  /**
   * The browser the rules currently open in (e.g., "Brave Browser")
   */
  fromBrowser: string;

  /**
   * The browser to move those rules to (e.g., "Arc", "Google Chrome", "Safari")
   */
  toBrowser: string;

  /**
   * Whether disabled rules should also be moved (default: true)
   */
  includeDisabled?: boolean;

  /**
   * Whether to also change Finicky's default browser when it is currently fromBrowser (default: false)
   */
  updateDefaultBrowser?: boolean;
};

async function plan(input: Input) {
  const rules = await loadRules();
  const defaultBrowser = await getDefaultBrowser();
  const result = reassignBrowser(rules, {
    from: input.fromBrowser,
    to: input.toBrowser,
    includeDisabled: input.includeDisabled ?? true,
  });
  const updateDefault = Boolean(input.updateDefaultBrowser) && sameBrowser(defaultBrowser, input.fromBrowser);
  return { ...result, rulesBefore: rules, defaultBrowser, updateDefault };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { changed, updateDefault } = await plan(input);
  if (changed.length === 0) return undefined;

  return {
    message: `Move ${changed.length} rule${changed.length === 1 ? "" : "s"} from ${input.fromBrowser} to ${input.toBrowser}?`,
    info: [
      { name: "Rules", value: changed.map((r) => r.name).join(", ") },
      ...(updateDefault ? [{ name: "Default Browser", value: `${input.fromBrowser} → ${input.toBrowser}` }] : []),
    ],
  };
};

/**
 * Move every rule that opens in one browser to another browser
 */
export default async function tool(input: Input) {
  if (sameBrowser(input.fromBrowser, input.toBrowser)) {
    return "❌ fromBrowser and toBrowser are the same browser.";
  }

  const preferences = getPreferenceValues<{ configPath?: string }>();
  const configPath = (preferences.configPath ?? "").trim();
  const { rules, changed, rulesBefore, defaultBrowser, updateDefault } = await plan(input);

  if (changed.length === 0) {
    const used = browserUsage(rulesBefore)
      .map((u) => `${u.browser} (${u.total})`)
      .join(", ");
    return `❌ No rules open in "${input.fromBrowser}". Browsers in use: ${used || "none"}.`;
  }

  const nextDefault = updateDefault ? input.toBrowser.trim() : defaultBrowser;
  if (configPath) {
    try {
      await syncConfigFile({ configPath, defaultBrowser: nextDefault, rules, previousRuleCount: rulesBefore.length });
    } catch (error) {
      if (error instanceof UnimportedRulesError) return `❌ ${error.message}`;
      throw error;
    }
  }
  await saveRules(rules);
  if (updateDefault) {
    await setDefaultBrowser(nextDefault);
  }

  return `✓ Moved ${changed.length} rule(s) from ${input.fromBrowser} to ${input.toBrowser}:\n${changed.map((r) => `- ${r.name}`).join("\n")}${updateDefault ? `\n\nDefault browser is now ${nextDefault}.` : ""}`;
}
