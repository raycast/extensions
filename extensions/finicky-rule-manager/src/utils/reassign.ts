import { Rule } from "../types";

export function sameBrowser(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Browsers referenced by rules, with how many rules use each, most used first.
 */
export function browserUsage(rules: Rule[]): { browser: string; total: number; enabled: number }[] {
  const usage = new Map<string, { browser: string; total: number; enabled: number }>();
  for (const rule of rules) {
    const key = rule.browser.trim().toLowerCase();
    const entry = usage.get(key) ?? { browser: rule.browser.trim(), total: 0, enabled: 0 };
    entry.total++;
    if (rule.enabled) entry.enabled++;
    usage.set(key, entry);
  }
  return [...usage.values()].sort((a, b) => b.total - a.total || a.browser.localeCompare(b.browser));
}

/**
 * Points every rule that opens in `from` at `to` instead. Disabled rules are
 * left alone unless `includeDisabled` is set.
 */
export function reassignBrowser(
  rules: Rule[],
  args: { from: string; to: string; includeDisabled: boolean },
): { rules: Rule[]; changed: Rule[] } {
  const to = args.to.trim();
  const changed: Rule[] = [];

  const next = rules.map((rule) => {
    if (!sameBrowser(rule.browser, args.from)) return rule;
    if (!rule.enabled && !args.includeDisabled) return rule;
    const updated = { ...rule, browser: to };
    changed.push(updated);
    return updated;
  });

  return { rules: next, changed };
}
