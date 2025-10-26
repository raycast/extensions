/**
 * Display filter utility for parsing search text with display number placeholders
 * Supports filtering windows by display using patterns like "#3" or "#2 chrome"
 */

export interface DisplayFilterResult {
  displayNumber: number | null;
  remainingSearchText: string;
  hasDisplayFilter: boolean;
}

/**
 * Regular expression to match display filter patterns at the start of search text
 * Matches patterns like "#3", "#1 ", "#2chrome", etc.
 * Only matches at the beginning of the search string
 */
const DISPLAY_FILTER_REGEX = /^#(\d+)\s*/;

/**
 * Parse search text to extract display filter and remaining search terms
 *
 * @param searchText - The raw search text from user input
 * @returns DisplayFilterResult containing parsed display number and remaining search text
 *
 * @example
 * parseDisplayFilter("#3")
 * // Returns: { displayNumber: 3, remainingSearchText: "", hasDisplayFilter: true }
 *
 * @example
 * parseDisplayFilter("#2 chrome")
 * // Returns: { displayNumber: 2, remainingSearchText: "chrome", hasDisplayFilter: true }
 *
 * @example
 * parseDisplayFilter("chrome #2")
 * // Returns: { displayNumber: null, remainingSearchText: "chrome #2", hasDisplayFilter: false }
 *
 * @example
 * parseDisplayFilter("chrome")
 * // Returns: { displayNumber: null, remainingSearchText: "chrome", hasDisplayFilter: false }
 */
export function parseDisplayFilter(searchText: string): DisplayFilterResult {
  if (!searchText || typeof searchText !== "string") {
    return {
      displayNumber: null,
      remainingSearchText: "",
      hasDisplayFilter: false,
    };
  }

  const match = searchText.match(DISPLAY_FILTER_REGEX);

  if (!match) {
    // No display filter found, return original search text
    return {
      displayNumber: null,
      remainingSearchText: searchText,
      hasDisplayFilter: false,
    };
  }

  const displayNumber = parseInt(match[1], 10);
  const remainingSearchText = searchText.slice(match[0].length).trim();

  // Validate display number (should be positive and reasonable)
  if (displayNumber <= 0 || displayNumber > 99) {
    // Treat invalid display numbers as regular search text
    return {
      displayNumber: null,
      remainingSearchText: searchText,
      hasDisplayFilter: false,
    };
  }

  return {
    displayNumber,
    remainingSearchText,
    hasDisplayFilter: true,
  };
}

/**
 * Check if a search text contains a display filter pattern
 * This is a lightweight check without full parsing
 *
 * @param searchText - The search text to check
 * @returns boolean indicating if display filter pattern is detected
 */
export function hasDisplayFilterPattern(searchText: string): boolean {
  return DISPLAY_FILTER_REGEX.test(searchText);
}

/**
 * Get display filter suggestions based on available displays
 * Useful for auto-complete or help text
 *
 * @param availableDisplays - Array of display numbers that exist
 * @returns Array of display filter examples
 */
export function getDisplayFilterSuggestions(availableDisplays: number[]): string[] {
  return availableDisplays.map((displayNum) => `#${displayNum}`);
}
