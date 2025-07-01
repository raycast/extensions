/**
 * Removes extra information from song titles such as anything after the first
 * hyphen, parenthesis, or bracket — unless the title starts with one of those.
 *
 * @param inputString - The raw song title
 * @returns A cleaned-up version of the song title
 */

function cleanupSongTitle(inputString: string): string {
  if (inputString.charAt(0) === "(" || inputString.charAt(0) === "[") {
    return inputString;
  }

  const firstOpeningParenthesisIndex: number = inputString.indexOf("(");
  const firstOpeningBracketIndex: number = inputString.indexOf("[");
  const firstHyphenIndex: number = inputString.indexOf("-");

  const index: number = Math.min(
    firstOpeningParenthesisIndex !== -1 ? firstOpeningParenthesisIndex : Infinity,
    firstOpeningBracketIndex !== -1 ? firstOpeningBracketIndex : Infinity,
    firstHyphenIndex !== -1 ? firstHyphenIndex : Infinity,
  );

  return index !== Infinity ? inputString.slice(0, index).trim() : inputString;
}

export default cleanupSongTitle;
