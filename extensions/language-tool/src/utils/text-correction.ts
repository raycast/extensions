import type { AppliedCorrections, CheckTextResponse, Match } from "../types";

/**
 * Extracts newline characters from the end of a string
 * @param text - The text to extract newline from
 * @returns The newline sequence at the end, or empty string if none
 */
function extractTrailingNewline(text: string): string {
  if (text.length === 0) return "";

  const lastChar = text[text.length - 1];
  const secondLastChar = text.length > 1 ? text[text.length - 2] : null;

  // Handle \r\n sequence (must check before single \n or \r)
  if (lastChar === "\n" && secondLastChar === "\r") {
    return "\r\n";
  }

  if (lastChar === "\n" || lastChar === "\r") {
    return lastChar;
  }

  return "";
}

/**
 * Adjusts replacement to preserve newlines when replacement ends with space
 * @param replacement - The replacement string
 * @param originalText - The original text being replaced
 * @returns Adjusted replacement with newline preserved if applicable
 */
function adjustReplacementForNewline(
  replacement: string,
  originalText: string,
): string {
  // Only adjust if replacement ends with space and original has trailing newline
  if (!replacement.endsWith(" ") || originalText.length === 0) {
    return replacement;
  }

  const trailingNewline = extractTrailingNewline(originalText);
  if (trailingNewline) {
    // Replace trailing space with the newline from original text
    return replacement.slice(0, -1) + trailingNewline;
  }

  return replacement;
}

/**
 * Returns the replacement a match suggests by default
 */
export function defaultReplacement(match: Match): string {
  return match.replacements[0]?.value || "";
}

/**
 * Applies a single correction to the text
 * @param text - The current text state
 * @param match - The match to apply
 * @param chosenReplacement - The replacement selected for this match
 * @param offset - Current offset adjustment from previous corrections
 * @returns Object with updated text and new offset
 */
function applySingleCorrection(
  text: string,
  match: {
    offset: number;
    length: number;
  },
  chosenReplacement: string,
  offset: number,
): { updatedText: string; newOffset: number } {
  let replacement = chosenReplacement;
  const start = match.offset + offset;
  const end = start + match.length;

  // Get the original text in the match interval
  const originalText = text.slice(start, end);

  // Adjust replacement to preserve newlines if needed
  replacement = adjustReplacementForNewline(replacement, originalText);

  // Apply the correction
  const updatedText = text.slice(0, start) + replacement + text.slice(end);
  const newOffset = offset + replacement.length - match.length;

  return { updatedText, newOffset };
}

/**
 * Calculates the corrected text by applying specified suggestions
 *
 * Pure function - can be used in any context (hooks, async commands, etc)
 *
 * @param textChecked - Original text
 * @param result - API response with matches
 * @param applied - Chosen replacement per match index
 * @returns Text with corrections applied
 */
export function calculateCorrectedText(
  textChecked: string,
  result: CheckTextResponse,
  applied: AppliedCorrections,
): string {
  if (!result.matches || applied.size === 0) {
    return textChecked;
  }

  // Keep each match paired with its chosen replacement, sorted by offset
  // (corrections must be applied in order for the running offset to hold)
  const sortedCorrections = result.matches
    .map((match, index) => ({ match, replacement: applied.get(index) }))
    .filter(
      (entry): entry is { match: Match; replacement: string } =>
        entry.replacement !== undefined,
    )
    .sort((a, b) => a.match.offset - b.match.offset);

  // Apply each correction sequentially
  let text = textChecked;
  let offset = 0;

  for (const { match, replacement } of sortedCorrections) {
    const { updatedText, newOffset } = applySingleCorrection(
      text,
      match,
      replacement,
      offset,
    );
    text = updatedText;
    offset = newOffset;
  }

  return text;
}

/**
 * Every match paired with the replacement it suggests by default
 */
export function allDefaultCorrections(
  result: CheckTextResponse,
): AppliedCorrections {
  return new Map(
    (result.matches || []).map((match, index) => [
      index,
      defaultReplacement(match),
    ]),
  );
}

/**
 * Applies ALL corrections from an API response, each with its first replacement
 *
 * @param textChecked - Original text
 * @param result - API response
 * @returns Fully corrected text
 */
export function applyAllCorrections(
  textChecked: string,
  result: CheckTextResponse,
): string {
  if (!result.matches || result.matches.length === 0) {
    return textChecked;
  }

  return calculateCorrectedText(
    textChecked,
    result,
    allDefaultCorrections(result),
  );
}
