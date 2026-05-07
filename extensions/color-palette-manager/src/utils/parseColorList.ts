import { isValidHexColor } from "./isValidHexColor";

export type ParseColorListResult = {
  /** Valid hex colors with duplicates removed (case-insensitive). */
  validColors: string[];
  /** Tokens that didn't match the hex pattern. */
  invalidEntries: string[];
  /** Count of valid hex tokens that were duplicates of an earlier valid token. */
  duplicateCount: number;
};

/**
 * Splits a pasted string of hex colors into validated, deduplicated entries.
 *
 * Newlines are normalized to the chosen separator first, so multi-line pastes
 * (one color per line) work without the user changing the separator. Duplicate
 * hex values are dropped (case-insensitive) — pasting the same color N times
 * shouldn't produce a palette with N identical swatches.
 */
export function parseColorList(input: string, separator: string): ParseColorListResult {
  if (!input?.trim() || !separator) {
    return { validColors: [], invalidEntries: [], duplicateCount: 0 };
  }
  const normalized = input.replace(/\r?\n/g, separator);
  const tokens = normalized
    .split(separator)
    .map((t) => t.trim())
    .filter(Boolean);

  const validColors: string[] = [];
  const invalidEntries: string[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  for (const token of tokens) {
    if (isValidHexColor(token)) {
      const key = token.toLowerCase();
      if (seen.has(key)) {
        duplicateCount += 1;
      } else {
        seen.add(key);
        validColors.push(token);
      }
    } else {
      invalidEntries.push(token);
    }
  }
  return { validColors, invalidEntries, duplicateCount };
}
