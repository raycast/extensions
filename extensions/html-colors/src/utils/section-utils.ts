import { ColorResult } from "./search-utils";
import { getMatchScore } from "./search-utils";
import { ShadeCategory, SHADE_ORDER } from "../constants";

type ColorSection = [string, ColorResult[]];

/**
 * Sort sections based on search relevance.
 * Returns sections ordered by:
 * 1. Best match score within each section
 * 2. Number of matches when scores are equal
 * 3. Static shade order when all else is equal
 *
 * @param sections - Array of [shade, colors] tuples
 * @param searchText - Text to match against
 * @returns Sorted array of sections
 */
export function sortSectionsByRelevance(sections: ColorSection[], searchText: string): ColorSection[] {
  // Get all non-empty sections
  const nonEmptySections = sections.filter((section) => section[1].length > 0);

  // If no search text, sort by static shade order
  if (!searchText) {
    return nonEmptySections.sort(
      ([shadeA], [shadeB]) =>
        SHADE_ORDER.indexOf(shadeA as ShadeCategory) - SHADE_ORDER.indexOf(shadeB as ShadeCategory),
    );
  }

  // Sort sections based on the best match score within each section
  return nonEmptySections.sort(([shadeA, colorsA], [shadeB, colorsB]) => {
    // Get the best match score for each section
    const getBestScore = (colors: ColorResult[]) =>
      Math.min(
        ...colors.map((color) => {
          const nameScore = getMatchScore(color.name, searchText);
          const hexScore = getMatchScore(color.hex, searchText);
          const rgbScore = getMatchScore(color.rgb, searchText);
          return Math.min(nameScore, hexScore, rgbScore);
        }),
      );

      const scoreA = getBestScore(colorsA);
  const scoreB = getBestScore(colorsB);

    // If scores are equal, sort by number of matches and then by static shade order
    if (scoreA === scoreB) {
      const matchesA = colorsA.filter((c) => c.name.toLowerCase().includes(searchText.toLowerCase())).length;
      const matchesB = colorsB.filter((c) => c.name.toLowerCase().includes(searchText.toLowerCase())).length;
      if (matchesA !== matchesB) return matchesB - matchesA;
      return SHADE_ORDER.indexOf(shadeA as ShadeCategory) - SHADE_ORDER.indexOf(shadeB as ShadeCategory);
    }

    return scoreA - scoreB;
  });
}
