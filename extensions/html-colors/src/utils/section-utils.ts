import { ColorResult } from "./search-utils";
import { getMatchScore } from "./search-utils";
import { ShadeCategory } from "./shade-mapping";

type ColorSection = [string, ColorResult[]];

/**
 * Sort sections based on search relevance.
 * Returns sections ordered by:
 * 1. Best match score within each section
 * 2. Number of matches when scores are equal
 * 3. Alphabetically by shade name when all else is equal
 * 
 * @param sections - Array of [shade, colors] tuples
 * @param searchText - Text to match against
 * @returns Sorted array of sections
 */
export function sortSectionsByRelevance(
  sections: ColorSection[],
  searchText: string
): ColorSection[] {
  if (!searchText) return sections;

  // Get all non-empty sections
  const nonEmptySections = sections.filter(([_, colors]) => colors.length > 0);
  
  // Sort sections based on the best match score within each section
  return nonEmptySections.sort(([shadeA, colorsA], [shadeB, colorsB]) => {
    // Get the best match score for each section
    const scoreA = Math.min(...colorsA.map(color => {
      const nameScore = getMatchScore(color.name, searchText);
      const hexScore = getMatchScore(color.hex, searchText);
      const rgbScore = getMatchScore(color.rgb, searchText);
      return Math.min(nameScore, hexScore, rgbScore);
    }));
    
    const scoreB = Math.min(...colorsB.map(color => {
      const nameScore = getMatchScore(color.name, searchText);
      const hexScore = getMatchScore(color.hex, searchText);
      const rgbScore = getMatchScore(color.rgb, searchText);
      return Math.min(nameScore, hexScore, rgbScore);
    }));

    // If scores are equal, sort by number of matches and then alphabetically
    if (scoreA === scoreB) {
      const matchesA = colorsA.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase())).length;
      const matchesB = colorsB.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase())).length;
      if (matchesA !== matchesB) return matchesB - matchesA;
      return shadeA.localeCompare(shadeB);
    }

    return scoreA - scoreB;
  });
} 