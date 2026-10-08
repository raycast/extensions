/**
 * Get a unique identifier for an entry
 *
 * Combines folder, title, and username to handle entries with
 * same title in different folders
 *
 * @param {string[]} entry - A KeePass database entry
 * @returns {string} - The unique identifier for the entry
 */
function getEntryId(entry: string[]): string {
  return `${entry[0]}|${entry[1]}|${entry[2]}`;
}

/**
 * Get an array of unique folder names from the given entries
 *
 * Folders are determined by the first element of each entry. If
 * the first element is empty, it is considered not a folder. The
 * folders are sorted case-insensitively
 *
 * @param {string[][]} entries - The KeePass database entries
 * @returns {string[]} - The unique folder names
 */
function getFolders(entries: string[][]): string[] {
  return Array.from(new Set(entries.map((entry: string[]) => entry[0]).filter((v: string) => v !== ""))).sort((a, b) =>
    (a as string).localeCompare(b as string),
  );
}

export { getEntryId, getFolders };
