import type { CheckTextResponse } from "../types";

/**
 * Calculates the corrected text by applying specified suggestions
 *
 * Pure function - can be used in any context (hooks, async commands, etc)
 *
 * @param textChecked - Original text
 * @param result - API response with matches
 * @param appliedIndexes - Set of suggestion indices to apply
 * @returns Text with applied corrections
 */
export function calculateCorrectedText(
  textChecked: string,
  result: CheckTextResponse,
  appliedIndexes: Set<number>,
): string {
  if (!result.matches || appliedIndexes.size === 0) {
    return textChecked;
  }

  let text = textChecked;
  let offset = 0;

  // Apply corrections in order
  const sortedMatches = result.matches
    .filter((_, index) => appliedIndexes.has(index))
    .sort((a, b) => a.offset - b.offset);

  for (const match of sortedMatches) {
    const replacement = match.replacements[0]?.value || "";
    const start = match.offset + offset;
    const end = start + match.length;

    text = text.slice(0, start) + replacement + text.slice(end);
    offset += replacement.length - match.length;
  }

  return text;
}

/**
 * Applies ALL corrections from an API response
 *
 * @param textChecked - Original text
 * @param result - API response
 * @returns Completely corrected text
 */
export function applyAllCorrections(textChecked: string, result: CheckTextResponse): string {
  if (!result.matches || result.matches.length === 0) {
    return textChecked;
  }

  // Create set with all indices
  const allIndexes = new Set(result.matches.map((_, index) => index));

  return calculateCorrectedText(textChecked, result, allIndexes);
}
