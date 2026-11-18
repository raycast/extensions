/**
 * Formats an alias for display in the Raycast list
 * Replaces "enter" with "↵" for newline characters
 * Removes the search text from the beginning of the alias if it matches
 * @param alias - The raw alias string
 * @param showFullAlias - Whether to show the full alias or hide the search matching part
 * @param searchText - The current search text to match against the alias
 * @returns The formatted alias string
 */
export function formatAlias(alias: string, showFullAlias: boolean = false, searchText: string = ""): string {
  const formattedAlias = alias.replace(/enter/g, "↵");

  if (showFullAlias) {
    return formattedAlias;
  }

  if (!searchText.trim()) {
    return formattedAlias;
  }

  // Remove searchText from the beginning if it matches
  if (formattedAlias.startsWith(searchText)) {
    return formattedAlias.slice(searchText.length);
  }

  return formattedAlias;
}
