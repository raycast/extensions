import Fuse from "fuse.js";
import { Color } from "../constants";

/**
 * Represents a color with multiple categories instead of a single category
 */
export type ColorResult = Omit<Color, "category"> & { categories: Color["category"][] };

/**
 * Calculate a match score for a text against a search term.
 * Returns a value between 0 and 1, where lower scores indicate better matches:
 * - 0.0: Exact match
 * - 0.2: Word boundary match
 * - 0.4: Start of word match
 * - 0.6-0.8: Contains match (score based on position)
 * - 1.0: No match
 */
export function getMatchScore(text: string, searchTerm: string): number {
  const normalizedText = text.toLowerCase();
  const normalizedSearch = searchTerm.toLowerCase();

  // Exact match
  if (normalizedText === normalizedSearch) return 0;

  // Match at word boundary
  if (
    normalizedText.startsWith(normalizedSearch + " ") ||
    normalizedText.includes(" " + normalizedSearch) ||
    normalizedText.endsWith(" " + normalizedSearch)
  )
    return 0.2;

  // Match at start
  if (normalizedText.startsWith(normalizedSearch)) return 0.4;

  // Contains a subset of the search term
  if (normalizedText.includes(normalizedSearch)) {
    // Score based on position (earlier is better)
    const position = normalizedText.indexOf(normalizedSearch);
    return 0.6 + (position / normalizedText.length) * 0.2;
  }

  return 1;
}

const searchOptions = {
  keys: [
    { name: "name", weight: 2 }, // Give more weight to name matches
    { name: "hex", weight: 1 },
    { name: "rgb", weight: 1 },
  ],
  threshold: 0.5,
  distance: 150,
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 2,
};

type FuseSearchResult = { item: Color; score?: number };

function filterByScore(results: FuseSearchResult[], threshold: number): Color[] {
  return results
    .filter((result) => result.score !== undefined && result.score < threshold)
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .map((result) => result.item);
}

function createCategorySet(color: Color): Set<Color["category"]> {
  return new Set([color.category]);
}

function mergeCategoryInformation(
  colorMap: Map<string, { color: Color; categories: Set<Color["category"]> }>,
  color: Color,
) {
  const existing = colorMap.get(color.name);
  if (existing) {
    colorMap.set(color.name, {
      color: existing.color,
      categories: new Set([...existing.categories, color.category]),
    });
  } else {
    colorMap.set(color.name, {
      color,
      categories: createCategorySet(color),
    });
  }
}

function deduplicateByName(colors: Color[]): ColorResult[] {
  const colorMap = new Map<string, { color: Color; categories: Set<Color["category"]> }>();
  colors.forEach((color) => mergeCategoryInformation(colorMap, color));

  return Array.from(colorMap.values()).map(({ color, categories }) => ({
    ...color,
    categories: Array.from(categories),
  }));
}

function convertToColorResult(color: Color): ColorResult {
  return {
    ...color,
    categories: [color.category],
  };
}

/**
 * Performs fuzzy search on colors using name, hex, and rgb values, with deduplication by name
 */
export function searchColors(colors: Color[], searchText: string): ColorResult[] {
  // Initialize new Fuse instance with current colors
  const searchIndex = new Fuse(colors, searchOptions);

  if (!searchText) {
    return colors.map(convertToColorResult);
  }

  const searchResults = searchIndex.search(searchText);
  const matchedColors = filterByScore(searchResults, searchOptions.threshold);
  return deduplicateByName(matchedColors);
}
