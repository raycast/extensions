import { loadRules, saveRules, getDefaultBrowser } from "../storage";
import { Rule } from "../types";
import { generateFinickyConfig, writeConfigFile } from "../utils/finicky";
import { expandTilde } from "../utils/path";
import { getPreferenceValues } from "@raycast/api";

type Input = {
  /**
   * The name/description of the rule (e.g., "Google services", "Salesforce")
   */
  name: string;

  /**
   * The match type to use: "wildcards" or "regex"
   */
  matchType: string;

  /**
   * URL patterns as a comma-separated or newline-separated string
   */
  patterns: string;

  /**
   * The browser to open matching URLs in (e.g., "Arc", "Brave Browser", "Google Chrome", "Safari")
   */
  browser: string;

  /**
   * Whether the rule should be enabled immediately (default: true)
   */
  enabled?: boolean;
};

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeMatchType(value: string): Rule["matchType"] {
  const matchType = value.trim().toLowerCase();
  if (matchType === "wildcards" || matchType === "regex") return matchType;
  throw new Error(`Invalid matchType "${value}". Use "wildcards" or "regex".`);
}

function parsePatterns(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
}

async function syncConfigFile(args: { configPath: string; defaultBrowser: string; rules: Rule[] }) {
  const configPath = expandTilde(args.configPath);
  const contents = generateFinickyConfig({ defaultBrowser: args.defaultBrowser, rules: args.rules });
  await writeConfigFile({ configPath, configContents: contents });
}

/**
 * Create a new Finicky rule with the specified patterns and browser
 */
export default async function tool(input: Input) {
  const preferences = getPreferenceValues<{ configPath?: string }>();
  const configPath = (preferences.configPath ?? "").trim();
  const defaultBrowser = await getDefaultBrowser();
  const patterns = parsePatterns(input.patterns);

  if (patterns.length === 0) {
    return "❌ Please provide at least one URL pattern.";
  }

  const rule: Rule = {
    id: uuid(),
    name: input.name,
    enabled: input.enabled ?? true,
    matchType: normalizeMatchType(input.matchType),
    patterns,
    browser: input.browser,
  };

  const existingRules = await loadRules();

  // Check for conflicts
  const conflicts = existingRules.filter((existingRule) => {
    if (!existingRule.enabled) return false;

    // Check if any patterns overlap
    return existingRule.patterns.some((existingPattern) =>
      patterns.some((newPattern) => {
        // Simple conflict detection: check if patterns are similar
        if (existingRule.matchType === "wildcards" && input.matchType === "wildcards") {
          // Extract domain from wildcard patterns
          const existingDomain = existingPattern.match(/\/\/([^/]+)/)?.[1]?.replace(/^\*\./, "");
          const newDomain = newPattern.match(/\/\/([^/]+)/)?.[1]?.replace(/^\*\./, "");
          return existingDomain === newDomain;
        }
        // For regex, check if patterns are the same
        return existingPattern === newPattern;
      }),
    );
  });

  if (conflicts.length > 0) {
    const conflictList = conflicts.map((c) => `- ${c.name}: ${c.patterns.join(", ")} → ${c.browser}`).join("\n");
    return `⚠️ Potential conflicts detected with existing rules:\n${conflictList}\n\nThe new rule "${input.name}" would match similar URLs. Do you want to:\n1. Create anyway (both rules will apply)\n2. Replace the conflicting rule(s)\n3. Cancel\n\nPlease specify how to handle this conflict.`;
  }

  const updatedRules = [...existingRules, rule];
  await saveRules(updatedRules);

  if (configPath) {
    await syncConfigFile({ configPath, defaultBrowser, rules: updatedRules });
  }

  return `✓ Successfully created rule "${input.name}"\n- Patterns: ${patterns.join(", ")}\n- Browser: ${input.browser}\n- Status: ${input.enabled ? "Enabled" : "Disabled"}`;
}
