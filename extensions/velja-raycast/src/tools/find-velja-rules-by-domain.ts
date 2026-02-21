import { getBrowserTitle } from "../lib/browsers";
import { findRulesByDomainOrUrl } from "../lib/rule-matching";
import { listRules } from "../lib/rules";
import { VeljaMatcherKind } from "../lib/types";

type Input = {
  /**
   * Domain or URL to evaluate against existing Velja rule matchers.
   */
  domainOrUrl: string;
  /**
   * Include disabled rules in the results.
   */
  includeDisabled?: boolean;
};

type MatchEvidence = {
  matcherId: string;
  kind: VeljaMatcherKind;
  pattern: string;
  fixture: string;
  matchedValue: string;
};

type RuleMatch = {
  id: string;
  title: string;
  isEnabled: boolean;
  browser: string;
  browserTitle: string;
  sourceApps: string[];
  matchedMatchers: MatchEvidence[];
};

type Output = {
  query: string;
  totalMatches: number;
  rules: RuleMatch[];
};

/**
 * Finds Velja rules that could match a given domain or URL.
 */
export default function tool(input: Input): Output {
  const query = input.domainOrUrl.trim();
  if (!query) {
    throw new Error("domainOrUrl is required.");
  }

  const includeDisabled = input.includeDisabled ?? false;
  const ruleMatches = findRulesByDomainOrUrl(listRules(), query).filter(
    (match) => includeDisabled || match.rule.isEnabled,
  );

  return {
    query,
    totalMatches: ruleMatches.length,
    rules: ruleMatches.map((match) => ({
      id: match.rule.id,
      title: match.rule.title,
      isEnabled: match.rule.isEnabled,
      browser: match.rule.browser,
      browserTitle: getBrowserTitle(match.rule.browser),
      sourceApps: match.rule.sourceApps,
      matchedMatchers: match.matchedMatchers,
    })),
  };
}
