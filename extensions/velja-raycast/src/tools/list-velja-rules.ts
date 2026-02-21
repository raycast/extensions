import { getBrowserTitle } from "../lib/browsers";
import { listRules } from "../lib/rules";
import { VeljaMatcher } from "../lib/types";

type RuleSummary = {
  id: string;
  title: string;
  isEnabled: boolean;
  browser: string;
  browserTitle: string;
  matcherCount: number;
  sourceAppCount: number;
  matchers: VeljaMatcher[];
};

type Output = {
  totalRules: number;
  rules: RuleSummary[];
};

/**
 * Lists existing Velja rules with matcher and browser summaries.
 */
export default function tool(): Output {
  const rules = listRules();

  return {
    totalRules: rules.length,
    rules: rules.map((rule) => ({
      id: rule.id,
      title: rule.title,
      isEnabled: rule.isEnabled,
      browser: rule.browser,
      browserTitle: getBrowserTitle(rule.browser),
      matcherCount: rule.matchers.length,
      sourceAppCount: rule.sourceApps.length,
      matchers: rule.matchers,
    })),
  };
}
