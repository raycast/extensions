/**
 * Removes extra information from song titles such as anything after the first
 * hyphen (surrounded by spaces), parenthesis, bracket, or "feat." — unless the title starts with one of those.
 *
 * @param inputString - The raw song title
 * @returns A cleaned-up version of the song title
 */
function cleanupSongTitle(inputString: string): string {
  // If title starts with a bracket or 'feat.', skip cleanup
  const lower = inputString.toLowerCase().trim();
  if (
    inputString.charAt(0) === "(" ||
    inputString.charAt(0) === "[" ||
    lower.startsWith("feat.") ||
    lower.startsWith("ft.") ||
    lower.startsWith("featuring")
  ) {
    return inputString;
  }

  const firstOpeningParenthesisIndex = inputString.indexOf("(");
  const firstOpeningBracketIndex = inputString.indexOf("[");

  const spacedHyphenIndex = inputString.indexOf(" - ");

  const featMatch = inputString.match(/(\s+|\()(feat\.|ft\.|featuring)(\s|\))/i);
  const featIndex = featMatch ? featMatch.index! : -1;

  // Determine the first relevant cutoff point
  const index = Math.min(
    firstOpeningParenthesisIndex !== -1 ? firstOpeningParenthesisIndex : Infinity,
    firstOpeningBracketIndex !== -1 ? firstOpeningBracketIndex : Infinity,
    spacedHyphenIndex !== -1 ? spacedHyphenIndex : Infinity,
    featIndex !== -1 ? featIndex : Infinity,
  );

  return index !== Infinity ? inputString.slice(0, index).trim() : inputString;
}

export default cleanupSongTitle;
