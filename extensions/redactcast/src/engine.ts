export type Rule = {
  id: string;
  pattern: RegExp;
  tokenType: string;
};

export type PersistedRule = {
  id: string;
  value: string;
  tokenType: string;
};

// Escapes a string so it can be embedded literally inside a RegExp.
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Builds a masking rule from a team-synced value. The value is matched
// literally (regex-escaped), so no remotely-supplied pattern is ever compiled
// as a regex — catastrophic backtracking (ReDoS) is impossible by construction.
export function compileLiteralRule(rule: PersistedRule): Rule | null {
  const value = rule.value?.trim();
  if (!value) return null;
  return {
    id: rule.id,
    pattern: new RegExp(escapeRegExp(value), "gi"),
    tokenType: rule.tokenType
  };
}

// Default rules for the MVP (Emails, Phone numbers, IPs)
export const DEFAULT_RULES: Rule[] = [
  {
    id: "email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    tokenType: "EMAIL"
  },
  {
    id: "phone",
    pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    tokenType: "PHONE"
  },
  {
    id: "ip",
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    tokenType: "IP"
  }
];

export function maskText(
  text: string,
  rules: Rule[] = DEFAULT_RULES
): { maskedText: string; mapping: Record<string, string> } {
  let maskedText = text;
  const mapping: Record<string, string> = {};
  const counters: Record<string, number> = {};

  for (const rule of rules) {
    const matches = Array.from(text.matchAll(rule.pattern));

    // Deduplicate matches to keep the same token for the same entity
    const uniqueMatches = [...new Set(matches.map(m => m[0]))];

    for (const match of uniqueMatches) {
      if (!counters[rule.tokenType]) counters[rule.tokenType] = 0;
      counters[rule.tokenType]++;

      const token = `[${rule.tokenType}_${counters[rule.tokenType]}]`;
      mapping[token] = match;

      // Replace all occurrences of this exact match with the token
      maskedText = maskedText.replace(new RegExp(escapeRegExp(match), "g"), token);
    }
  }

  return { maskedText, mapping };
}

export function rehydrateText(maskedText: string, mapping: Record<string, string>): string {
  let restoredText = maskedText;

  // Sort tokens by length descending to prevent partial replacements (e.g. [EMAIL_1] and [EMAIL_10])
  const tokens = Object.keys(mapping).sort((a, b) => b.length - a.length);

  for (const token of tokens) {
    const originalValue = mapping[token];
    restoredText = restoredText.replace(new RegExp(escapeRegExp(token), "g"), originalValue);
  }

  return restoredText;
}
