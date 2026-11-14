import type { CheckTextResponse, Match } from "../types";

/**
 * Checks if a match has a valid replacement (not just whitespace or newlines)
 * @param match - The match to check
 * @returns true if the match should be included
 */
function isValidMatch(match: Match): boolean {
  const replacement = match.replacements[0]?.value || "";
  // Ignore matches with empty replacement or only whitespace/newlines
  if (!replacement) return false;
  // Check if replacement contains only whitespace or newlines
  return !/^[\s\n\r]*$/.test(replacement);
}

/**
 * Filters out matches with invalid replacements (empty or only whitespace/newlines)
 * @param result - The API response with matches
 * @returns Filtered result with only valid matches
 */
export function filterValidMatches(
  result: CheckTextResponse,
): CheckTextResponse {
  if (!result.matches || result.matches.length === 0) {
    return result;
  }

  const validMatches = result.matches.filter(isValidMatch);

  return {
    ...result,
    matches: validMatches,
  };
}

/**
 * Drops every match that overlaps one kept before it.
 *
 * LanguageTool can flag the same words twice — a spelling rule and a grammar
 * rule reaching for the same span. Applying both would splice the second
 * replacement into the middle of the first and corrupt every offset after it,
 * so only one of an overlapping pair can survive. The leftmost wins, and the
 * longer one where two start together: that is the match whose replacement the
 * reader sees marked in the text.
 */
export function withoutOverlappingMatches(
  result: CheckTextResponse,
): CheckTextResponse {
  const matches = result.matches ?? [];
  if (matches.length < 2) return result;

  const ordered = [...matches].sort(
    (a, b) => a.offset - b.offset || b.length - a.length,
  );

  const kept: Match[] = [];
  let end = -1;

  for (const match of ordered) {
    if (match.offset < end) continue;
    kept.push(match);
    end = match.offset + match.length;
  }

  return kept.length === matches.length ? result : { ...result, matches: kept };
}
