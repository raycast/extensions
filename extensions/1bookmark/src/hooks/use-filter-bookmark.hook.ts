import { useMemo } from "react";
import { PreparedBookmark } from "./use-prepare-bookmark-search.hook";

/**
 * Parse special filter characters from the keyword
 * !space - Filter by space name or bookmark creator name
 * @user - Filter by creator name
 * #tag# - Filter by tag (must be surrounded by # symbols)
 */
function parseKeywordFilters(keyword: string) {
  const filters = {
    spaceFilters: [] as string[],
    creatorFilters: [] as string[],
    tagFilters: [] as string[],
    cleanKeyword: keyword,
  };

  // Extract space filters (!space)
  const spaceMatches = keyword.match(/!(\S+)/g);
  if (spaceMatches) {
    filters.spaceFilters = spaceMatches.map((match) => match.substring(1).toLowerCase());
    filters.cleanKeyword = filters.cleanKeyword.replace(/!(\S+)/g, "");
  }

  // Extract creator filters (@creator)
  const creatorMatches = keyword.match(/@(\S+)/g);
  if (creatorMatches) {
    filters.creatorFilters = creatorMatches.map((match) => match.substring(1).toLowerCase());
    filters.cleanKeyword = filters.cleanKeyword.replace(/@(\S+)/g, "");
  }

  // Extract tag filters (#tag#)
  const tagMatches = keyword.match(/#([^#\s]+)#/g);
  if (tagMatches) {
    filters.tagFilters = tagMatches.map((match) => match.substring(1, match.length - 1).toLowerCase());
    filters.cleanKeyword = filters.cleanKeyword.replace(/#([^#\s]+)#/g, "");
  }

  // Clean up extra spaces and trim
  filters.cleanKeyword = filters.cleanKeyword.replace(/\s+/g, " ").trim();

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
  taggedPrepare: PreparedBookmark[];
  untaggedPrepare: PreparedBookmark[];
}): {
  filteredTaggedPreparedBookmarks: PreparedBookmark[];
  filteredUntaggedPreparedBookmarks: PreparedBookmark[];
  cleanKeyword: string;
  hasSpaceFilter: boolean;
  hasCreatorFilter: boolean;
  hasTagFilter: boolean;
} => {
  const { keyword, taggedPrepare, untaggedPrepare } = params;

  return useMemo(() => {
    // Parse special filters from the keyword
    const { cleanKeyword, spaceFilters, creatorFilters, tagFilters } = parseKeywordFilters(keyword);
    const hasFilters = spaceFilters.length > 0 || creatorFilters.length > 0 || tagFilters.length > 0;

    if (!hasFilters) {
      // If there are no filters, return the original data with cleanKeyword
      return {
        filteredTaggedPreparedBookmarks: taggedPrepare,
        filteredUntaggedPreparedBookmarks: untaggedPrepare,
        cleanKeyword,
        hasSpaceFilter: false,
        hasCreatorFilter: false,
        hasTagFilter: false,
      };
    }

    // Apply filters to both tagged and untagged bookmarks
    const filters = { spaceFilters, creatorFilters, tagFilters };
    const filteredTaggedPreparedBookmarks = filterAsPattern(taggedPrepare, filters);
    const filteredUntaggedPreparedBookmarks = filterAsPattern(untaggedPrepare, filters);

    return {
      filteredTaggedPreparedBookmarks,
      filteredUntaggedPreparedBookmarks,
      cleanKeyword,
      hasSpaceFilter: spaceFilters.length > 0,
      hasCreatorFilter: creatorFilters.length > 0,
      hasTagFilter: tagFilters.length > 0,
    };
  }, [keyword, taggedPrepare, untaggedPrepare]);
};
