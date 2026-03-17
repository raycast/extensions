const cleanupSongTitle = (inputString: string): string => {
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
};

export const formatTitle = ({
  name,
  artistName,
  hideArtistName,
  maxTextLength,
  cleanupTitle,
}: {
  name: string;
  artistName: string;
  hideArtistName: boolean;
  maxTextLength: string;
  cleanupTitle: boolean;
}) => {
  const max = maxTextLength ? Number(maxTextLength) : 30;

  if (max === 0) {
    return "";
  }

  if (!name || !artistName) {
    return "";
  }

  const filteredName = cleanupTitle ? cleanupSongTitle(name) : name;
  const title = hideArtistName ? filteredName : `${filteredName} · ${artistName}`;

  if (title.length <= max) {
    return title;
  }

  return title.substring(0, max).trim() + "…";
};
