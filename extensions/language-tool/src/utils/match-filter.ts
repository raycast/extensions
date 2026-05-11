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
