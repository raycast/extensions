import { useMemo } from "react";
import { PreparedBookmark } from "./use-prepare-bookmark-search.hook";

/**
 * Parse special filter characters from the keyword (token-based).
 * !space  - Filter by space name
 * @user   - Filter by creator name
 * #tag    - Filter by tag
 * ##text  - Escape: literal "#text" in the search keyword (e.g. Slack channels)
 */
function parseKeywordFilters(keyword: string) {
  const filters = {
    spaceFilters: [] as string[],
    creatorFilters: [] as string[],
    tagFilters: [] as string[],
    cleanKeyword: "",
  };

  const cleanParts: string[] = [];

  for (const token of keyword.split(/\s+/).filter(Boolean)) {
    if (token.startsWith("##")) {
      cleanParts.push(token.slice(1));
    } else if (token.length > 1 && token.startsWith("#")) {
      filters.tagFilters.push(token.slice(1).toLowerCase());
    } else if (token.length > 1 && token.startsWith("!")) {
      filters.spaceFilters.push(token.slice(1).toLowerCase());
    } else if (token.length > 1 && token.startsWith("@")) {
      filters.creatorFilters.push(token.slice(1).toLowerCase());
    } else {
      cleanParts.push(token);
    }
  }

  filters.cleanKeyword = cleanParts.join(" ");
  return filters;
}

/**
 * Apply filters to bookmarks
 */
function filterAsPattern(
  preparedBookmarks: PreparedBookmark[],
  filters: {
    spaceFilters: string[];
    creatorFilters: string[];
    tagFilters: string[];
  },
) {
  const { spaceFilters, creatorFilters, tagFilters } = filters;

  return preparedBookmarks.filter((bookmark) => {
    // Filter by space name
    const matchesSpace =
      spaceFilters.length === 0 || spaceFilters.some((filter) => bookmark.spaceName.toLowerCase().includes(filter));

    // Filter by creator name
    const matchesCreator =
      creatorFilters.length === 0 ||
      creatorFilters.some((filter) => bookmark.authorNameAndEmail.toLowerCase().includes(filter));

    // Filter by tag
    const matchesTag =
      tagFilters.length === 0 ||
      tagFilters.some((filter) => bookmark.tags.some((tag) => tag.toLowerCase().includes(filter)));

    // Return true if all active filters match
    return matchesSpace && matchesCreator && matchesTag;
  });
}

/**
 * A hook that filters bookmarks based on special filter characters in the keyword
 * It extracts filter terms from the keyword and applies them to the bookmarks
 */
export const useFilterBookmark = (params: {
  keyword: string;
  prepared: PreparedBookmark[];
}): {
  filteredPrepared: PreparedBookmark[];
  cleanKeyword: string;
  hasSpaceFilter: boolean;
  hasCreatorFilter: boolean;
  hasTagFilter: boolean;
} => {
  const { keyword, prepared } = params;

  return useMemo(() => {
    const { cleanKeyword, spaceFilters, creatorFilters, tagFilters } = parseKeywordFilters(keyword);
    const hasFilters = spaceFilters.length > 0 || creatorFilters.length > 0 || tagFilters.length > 0;

    // If no filters are active, return the original data
    if (!hasFilters) {
      return {
        filteredPrepared: prepared,
        cleanKeyword,
        hasSpaceFilter: false,
        hasCreatorFilter: false,
        hasTagFilter: false,
      };
    }

    const filters = { spaceFilters, creatorFilters, tagFilters };

    return {
      filteredPrepared: filterAsPattern(prepared, filters),
      cleanKeyword,
      hasSpaceFilter: spaceFilters.length > 0,
      hasCreatorFilter: creatorFilters.length > 0,
      hasTagFilter: tagFilters.length > 0,
    };
  }, [keyword, prepared]);
};
