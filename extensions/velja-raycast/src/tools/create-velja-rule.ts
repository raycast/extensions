import { Action, Tool } from "@raycast/api";
import { getSelectableBrowserIdentifiers } from "../lib/browsers";
import { CreateRuleInput, createRule } from "../lib/rules";
import { VeljaMatcherKind } from "../lib/types";
import { readVeljaConfig } from "../lib/velja";

type Input = {
  /**
   * Human-readable title for the new rule.
   */
  title: string;
  /**
   * Browser identifier to target (use an identifier returned by get-preferred-browsers).
   */
  browser: string;
  /**
   * Matcher mode for URL matching.
   */
  matcherKind?: VeljaMatcherKind;
  /**
   * Pattern for the matcher (for example: "example.com" or "https://example.com/path").
   */
  matcherPattern?: string;
  /**
   * Sample URL fixture for the matcher test.
   */
  matcherFixture?: string;
  /**
   * Optional source application bundle IDs.
   */
  sourceApps?: string[];
  /**
   * Open in a new browser window.
   */
  forceNewWindow?: boolean;
  /**
   * Open in background.
   */
  openInBackground?: boolean;
  /**
   * Only apply when opening from AirDrop.
   */
  onlyFromAirdrop?: boolean;
  /**
   * Evaluate this rule after built-in Velja rules.
   */
  runAfterBuiltinRules?: boolean;
  /**
   * Enable transform script execution.
   */
  isTransformScriptEnabled?: boolean;
  /**
   * Transform script source.
   */
  transformScript?: string;
};

type Output = {
  id: string;
  title: string;
  browser: string;
  matcherCount: number;
  sourceAppCount: number;
};

function normalizeSourceApps(sourceApps: Input["sourceApps"]): string[] {
  return (sourceApps ?? []).map((sourceApp) => sourceApp.trim()).filter(Boolean);
}

function resolveMatcherKind(matcherKind?: VeljaMatcherKind): VeljaMatcherKind {
  return matcherKind ?? "hostSuffix";
}

function availableBrowserIdentifiers(): string[] {
  const config = readVeljaConfig();
  return getSelectableBrowserIdentifiers(config.preferredBrowsers, {
    includePrompt: true,
    promptFirst: true,
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const matcherPattern = input.matcherPattern?.trim() ?? "";
  const sourceApps = normalizeSourceApps(input.sourceApps);

  return {
    style: Action.Style.Regular,
    message: `Create Velja rule "${input.title.trim()}"?`,
    info: [
      { name: "Browser", value: input.browser },
      {
        name: "Matcher",
        value: matcherPattern ? `${resolveMatcherKind(input.matcherKind)}: ${matcherPattern}` : "No matcher",
      },
      { name: "Source Apps", value: sourceApps.length > 0 ? sourceApps.join(", ") : "No source-app filter" },
    ],
  };
};

/**
 * Creates a Velja routing rule.
 */
export default function tool(input: Input): Output {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Rule title is required.");
  }

  const browser = input.browser.trim();
  const availableBrowsers = availableBrowserIdentifiers();
  if (!availableBrowsers.includes(browser)) {
    throw new Error(
      `Browser "${browser}" is not available. Call get-preferred-browsers and use one of: ${availableBrowsers.join(
        ", ",
      )}`,
    );
  }

  const createRuleInput: CreateRuleInput = {
    title,
    browser,
    matcherKind: resolveMatcherKind(input.matcherKind),
    matcherPattern: input.matcherPattern?.trim() ?? "",
    matcherFixture: input.matcherFixture?.trim() ?? "",
    sourceApps: normalizeSourceApps(input.sourceApps),
    forceNewWindow: input.forceNewWindow ?? false,
    openInBackground: input.openInBackground ?? false,
    onlyFromAirdrop: input.onlyFromAirdrop ?? false,
    runAfterBuiltinRules: input.runAfterBuiltinRules ?? false,
    isTransformScriptEnabled: input.isTransformScriptEnabled ?? false,
    transformScript: input.transformScript?.trim() ?? "",
  };

  const createdRule = createRule(createRuleInput);

  return {
    id: createdRule.id,
    title: createdRule.title,
    browser: createdRule.browser,
    matcherCount: createdRule.matchers.length,
    sourceAppCount: createdRule.sourceApps.length,
  };
}
