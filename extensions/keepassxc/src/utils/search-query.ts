const FIELD_TERM = /(?<!\S)([-!+*]*)(user|u|title|t|url|group|g):(?:"([^"]*)"?|(\S*))/gi;
const FIELD_INDEX: Record<string, number> = { user: 2, u: 2, title: 1, t: 1, url: 4, group: 0, g: 0 };

/**
 * Escape the special characters of a string for use in a regular expression
 *
 * @param {string} value - The string to escape
 * @returns {string} - The escaped string
 */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Build the regular expression of a field term
 *
 * Follows the KeePassXC search syntax: `*` treats the value as a regular expression,
 * `+` requires an exact match, otherwise the value is a case-insensitive "contains"
 * supporting the `*` (anything), `?` (one character) and `|` (OR) wildcards
 *
 * @param {string} modifiers - The modifiers preceding the field (`-`, `!`, `+`, `*`)
 * @param {string} value - The value of the field term
 * @returns {RegExp} - The regular expression matching the field value
 */
function termRegex(modifiers: string, value: string): RegExp {
  if (modifiers.includes("*")) {
    try {
      return new RegExp(value, "i");
    } catch {
      return new RegExp(escapeRegex(value), "i");
    }
  }
  const pattern = value
    .split("|")
    .map((alt) => escapeRegex(alt).replace(/\\\*/g, ".*").replace(/\\\?/g, "."))
    .join("|");
  return new RegExp(modifiers.includes("+") ? `^(?:${pattern})$` : pattern, "i");
}

/**
 * Parse a search query using the KeePassXC search syntax for the username, title, URL and group fields
 *
 * Field terms (`user:`/`u:`, `title:`/`t:`, `url:`, `group:`/`g:`) are extracted from the query and combined
 * with AND. A term preceded by `-` or `!` excludes matching entries. Values with spaces can be
 * quoted. The remaining text is returned for free-text search
 *
 * @param {string} searchText - The search bar text
 * @returns {{ matches: (entry: string[]) => boolean; text: string }} - A predicate checking an entry against the field terms, and the remaining free text
 */
function parseSearchQuery(searchText: string): { matches: (entry: string[]) => boolean; text: string } {
  const terms = [...searchText.matchAll(FIELD_TERM)].map(([, modifiers, field, quoted, word]) => ({
    index: FIELD_INDEX[field.toLowerCase()],
    exclude: /[-!]/.test(modifiers),
    regex: termRegex(modifiers, quoted ?? word),
  }));
  return {
    matches: (entry) => terms.every(({ index, exclude, regex }) => regex.test(entry[index]) !== exclude),
    text: searchText.replace(FIELD_TERM, "").trim(),
  };
}

export { parseSearchQuery };
