/**
 * Highlights matching text using Unicode characters for visual emphasis
 * Since Raycast doesn't support markdown in List.Item titles, we use Unicode markers
 * @param text - The full text to search in
 * @param searchText - The text to highlight
 * @returns The text with highlighted matches using Unicode characters
 */
export function highlightMatch(text: string, searchText: string): string {
  if (!searchText.trim() || !text) {
    return text;
  }

  // Escape special regex characters in searchText
  const escapedSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${escapedSearchText})`, "gi");

  // Use Unicode characters for better visual emphasis
  // Option 1: Using double angle brackets «text» (elegant and readable)
  // Option 2: Using arrows →text← (more visible but can be intrusive)
  // Option 3: Using single quotes 'text' (subtle)
  // Option 4: Using underscores _text_ (minimal)
  // We'll use «text» for a clean, readable highlight
  return text.replace(regex, "«$1»");
}

/**
 * Gets the parts of text split by the search term for custom rendering
 * @param text - The full text to search in
 * @param searchText - The text to find
 * @returns Array of text parts with match information
 */
export function getHighlightedParts(text: string, searchText: string): Array<{ text: string; isMatch: boolean }> {
  if (!searchText.trim() || !text) {
    return [{ text, isMatch: false }];
  }

  const escapedSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedSearchText})`, "gi");
  const parts: Array<{ text: string; isMatch: boolean }> = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        isMatch: false,
      });
    }
    // Add matched text
    parts.push({ text: match[0], isMatch: true });
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), isMatch: false });
  }

  return parts.length > 0 ? parts : [{ text, isMatch: false }];
}
