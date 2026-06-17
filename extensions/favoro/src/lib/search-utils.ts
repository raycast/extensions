import type { SearchResultLink, GroupedSearchResults, CachedData, FavoroArea, FavoroSection } from "../types";

/**
 * Converts all cached links to SearchResultLink format with area/section info.
 * Used to display all links when no search query is provided.
 */
export function getAllCachedLinks(cache: CachedData): SearchResultLink[] {
  const areaMap = new Map<string, FavoroArea>(cache.areas.map((a) => [a.id, a]));
  const sectionMap = new Map<string, FavoroSection>(cache.sections.map((s) => [s.id, s]));

  return cache.links.map((link) => {
    const areaRef = link.relationships?.area?.data;
    const sectionRef = link.relationships?.section?.data;
    const areaId = areaRef && !Array.isArray(areaRef) ? areaRef.id : undefined;
    const sectionId = sectionRef && !Array.isArray(sectionRef) ? sectionRef.id : undefined;

    const area = areaId ? areaMap.get(areaId) : undefined;
    const section = sectionId ? sectionMap.get(sectionId) : undefined;

    return {
      ...link,
      area: area ? { id: area.id, name: area.attributes.name } : undefined,
      section: section ? { id: section.id, name: section.attributes.title } : undefined,
    };
  });
}

/**
 * Groups search results by area and section for display
 */
export function groupResults(links: SearchResultLink[]): GroupedSearchResults {
  const grouped: GroupedSearchResults = {};

  for (const link of links) {
    const areaId = link.area?.id ?? "uncategorized";
    const areaName = link.area?.name ?? "Uncategorized";
    const sectionId = link.section?.id ?? "uncategorized";
    const sectionName = link.section?.name ?? "Uncategorized";

    if (!grouped[areaId]) {
      grouped[areaId] = {
        area: { id: areaId, name: areaName },
        sections: {},
      };
    }

    if (!grouped[areaId].sections[sectionId]) {
      grouped[areaId].sections[sectionId] = {
        section: { id: sectionId, name: sectionName },
        links: [],
      };
    }

    grouped[areaId].sections[sectionId].links.push(link);
  }

  return grouped;
}

/**
 * Searches cached links with relevance scoring.
 * Uses AND logic: all search terms must be present across searchable fields.
 * Prioritizes matches where all terms appear in the same field (e.g., label).
 */
export function searchCachedLinks(query: string, cache: CachedData): SearchResultLink[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const terms = normalizedQuery.split(/\s+/).filter((t) => t.length > 0);
  if (terms.length === 0) return [];

  // Build lookup maps
  const areaMap = new Map<string, FavoroArea>(cache.areas.map((a) => [a.id, a]));
  const sectionMap = new Map<string, FavoroSection>(cache.sections.map((s) => [s.id, s]));

  // Score and filter links
  const scored = cache.links
    .map((link) => {
      const areaRef = link.relationships?.area?.data;
      const sectionRef = link.relationships?.section?.data;
      const areaId = areaRef && !Array.isArray(areaRef) ? areaRef.id : undefined;
      const sectionId = sectionRef && !Array.isArray(sectionRef) ? sectionRef.id : undefined;

      const area = areaId ? areaMap.get(areaId) : undefined;
      const section = sectionId ? sectionMap.get(sectionId) : undefined;

      // Normalize searchable fields
      const label = link.attributes.label?.toLowerCase() ?? "";
      const url = link.attributes.url?.toLowerCase() ?? "";
      const description = link.attributes.description?.toLowerCase() ?? "";
      const areaName = area?.attributes.name?.toLowerCase() ?? "";
      const sectionTitle = section?.attributes.title?.toLowerCase() ?? "";

      // Step 1: Check if ALL terms are present (across all fields combined)
      const allTermsPresent = terms.every(
        (term) =>
          label.includes(term) ||
          url.includes(term) ||
          description.includes(term) ||
          areaName.includes(term) ||
          sectionTitle.includes(term),
      );

      if (!allTermsPresent) {
        return { link, score: 0, area, section };
      }

      // Step 2: Score based on WHERE terms match (higher = better)
      let score = 0;

      // Label matches are most valuable (10 points per term, +20 bonus if all terms match)
      const labelMatchCount = terms.filter((t) => label.includes(t)).length;
      score += labelMatchCount * 10;
      if (labelMatchCount === terms.length) {
        score += 20;
      }

      // URL matches (5 points per term, +10 bonus if all terms match)
      const urlMatchCount = terms.filter((t) => url.includes(t)).length;
      score += urlMatchCount * 5;
      if (urlMatchCount === terms.length) {
        score += 10;
      }

      // Description matches (3 points per term, +5 bonus if all terms match)
      const descMatchCount = terms.filter((t) => description.includes(t)).length;
      score += descMatchCount * 3;
      if (descMatchCount === terms.length) {
        score += 5;
      }

      // Area name matches (2 points per term, +5 bonus if all terms match)
      const areaMatchCount = terms.filter((t) => areaName.includes(t)).length;
      score += areaMatchCount * 2;
      if (areaMatchCount === terms.length) {
        score += 5;
      }

      // Section title matches (2 points per term, +5 bonus if all terms match)
      const sectionMatchCount = terms.filter((t) => sectionTitle.includes(t)).length;
      score += sectionMatchCount * 2;
      if (sectionMatchCount === terms.length) {
        score += 5;
      }

      return { link, score, area, section };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Convert to SearchResultLink format
  return scored.map(({ link, area, section }) => ({
    ...link,
    area: area ? { id: area.id, name: area.attributes.name } : undefined,
    section: section ? { id: section.id, name: section.attributes.title } : undefined,
  }));
}
