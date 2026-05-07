import { isValidHexColor } from "./isValidHexColor";

export type ParseColorListResult = {
  validColors: string[];
  invalidEntries: string[];
};

/**
 * Splits a pasted string of hex colors into validated entries.
 *
 * Newlines are normalized to the chosen separator first, so multi-line pastes
 * (one color per line) work without the user changing the separator.
 */
export function parseColorList(input: string, separator: string): ParseColorListResult {
  if (!input?.trim() || !separator) {
    return { validColors: [], invalidEntries: [] };
  }
  const normalized = input.replace(/\r?\n/g, separator);
  const tokens = normalized
    .split(separator)
    .map((t) => t.trim())
    .filter(Boolean);

  const validColors: string[] = [];
  const invalidEntries: string[] = [];
  for (const token of tokens) {
    if (isValidHexColor(token)) {
      validColors.push(token);
    } else {
      invalidEntries.push(token);
    }
  }
  return { validColors, invalidEntries };
}
