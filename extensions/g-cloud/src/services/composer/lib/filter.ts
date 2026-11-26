// Search-bar token filtering shared by every level of the hierarchy. Pure.
//
//   project:my-prod   env:prod   dag:dwh   task:dbt   tag:finance   owner:airflow
//   is:failed | is:paused | is:running | is:success | is:import-error | is:active   op:Bash
//
// Anything that is not key:value is free text; every free word must match (case-insensitive
// substring) somewhere in the item's haystack. A leading "-" negates a token (-is:paused).

export const TOKEN_KEYS = [
  "project",
  "env",
  "dag",
  "run",
  "task",
  "tag",
  "owner",
  "is",
  "state",
  "op",
  "type",
] as const;
export type TokenKey = (typeof TOKEN_KEYS)[number];

export interface Token {
  key: TokenKey;
  value: string;
  negate: boolean;
}

export interface ParsedSearch {
  words: string[];
  tokens: Token[];
}

export function parseSearch(text: string): ParsedSearch {
  const words: string[] = [];
  const tokens: Token[] = [];
  for (const raw of text.trim().split(/\s+/).filter(Boolean)) {
    const negate = raw.startsWith("-") && raw.includes(":");
    const part = negate ? raw.slice(1) : raw;
    const i = part.indexOf(":");
    const key = (i > 0 ? part.slice(0, i).toLowerCase() : "") as TokenKey;
    const value = i > 0 ? part.slice(i + 1).toLowerCase() : "";
    if (i > 0 && value && (TOKEN_KEYS as readonly string[]).includes(key)) {
      tokens.push({ key: key === "state" ? "is" : key, value, negate });
    } else {
      words.push(raw.toLowerCase());
    }
  }
  return { words, tokens };
}

/**
 * Field values an item exposes per token key. `is` values are flags like "failed", "paused".
 * Keys the item does not expose are ignored (so `task:` on a DAG row does not hide it).
 */
export type Fields = Partial<Record<TokenKey, (string | undefined | null)[]>>;

export function matches(parsed: ParsedSearch, fields: Fields, haystack: (string | undefined | null)[]): boolean {
  for (const t of parsed.tokens) {
    const vals = fields[t.key];
    if (!vals) continue;
    // is: flags match exactly (so is:failed does not match latest-failed); other keys are substrings
    const hit = vals.some(
      (v) => !!v && (t.key === "is" ? v.toLowerCase() === t.value : v.toLowerCase().includes(t.value)),
    );
    if (hit === t.negate) return false;
  }
  if (!parsed.words.length) return true;
  const hay = haystack.filter(Boolean).join(" ").toLowerCase();
  return parsed.words.every((w) => hay.includes(w));
}

/** Replace (or add) one token in the search text, e.g. when a filter action is chosen. */
export function setToken(text: string, key: TokenKey, value: string | undefined): string {
  const kept = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !new RegExp(`^-?${key}:`, "i").test(w));
  if (value) kept.push(`${key}:${value}`);
  return kept.join(" ") + (kept.length ? " " : "");
}
