import fuzzysort from "fuzzysort";
import { Bookmark } from "../types";
import { useMemo } from "react";
import { PreparedBookmarkSearch, PreparedBookmarkItem } from "./use-prepare-bookmark-search.hook";

// Maximum number of search results
const MAX_SEARCH_RESULTS = 30;

/**
 * Function to search by a single field (name or URL)
 */
function searchByField(params: {
  keyword: string;
  searchTargets: Array<{ prepared: Fuzzysort.Prepared; originalIndex: number }>;
  preparedItems: PreparedBookmarkItem[];
}) {
  const { keyword, searchTargets, preparedItems } = params;

  // Execute search
  const results = fuzzysort.go(keyword, searchTargets, {
    key: "prepared",
    limit: MAX_SEARCH_RESULTS,
    threshold: 0.25,
  });

  // Find original bookmarks from search results
  return results.map((result) => {
    const originalIndex = result.obj.originalIndex;
    return {
      item: preparedItems[originalIndex].original,
      score: result.score,
    };
  });
}

/**
 * Function to combine search results from multiple fields and remove duplicates
 * Designed to be easily extensible when new fields are added
 */
function combineSearchResults(...searchResults: Array<Array<{ item: Bookmark; score: number }>>) {
  // Combine all search results into a single array
  const allMatches = searchResults.flat();

  // Remove duplicates and keep the highest score
  const uniqueMatches = new Map<string, { item: Bookmark; score: number }>();

  for (const match of allMatches) {
    const id = match.item.id;
    const existingMatch = uniqueMatches.get(id);

    if (!existingMatch || match.score > existingMatch.score) {
      uniqueMatches.set(id, match);
    }
  }

  // Sort by score and get final results
  return Array.from(uniqueMatches.values())
    .sort((a, b) => b.score - a.score)
    .map((match) => match.item);
}

/**
 * Helper function to process search results
 * Performs searches for name and URL separately and combines the results
 */
function processSearchResults(params: {
  keyword: string;
  searchTarget: {
    nameSearchTargets: Array<{ prepared: Fuzzysort.Prepared; originalIndex: number }>;
    urlSearchTargets: Array<{ prepared: Fuzzysort.Prepared; originalIndex: number }>;
    prepared: PreparedBookmarkItem[];
  };
}) {
  const { keyword, searchTarget } = params;
  const { nameSearchTargets, urlSearchTargets, prepared: preparedItems } = searchTarget;

  // Search by name
  const nameMatches = searchByField({
    keyword,
    searchTargets: nameSearchTargets,
    preparedItems,
  });

  // Search by URL
  const urlMatches = searchByField({
    keyword,
    searchTargets: urlSearchTargets,
    preparedItems,
  });

  // Combine and sort search results (add new fields here when needed)
  return combineSearchResults(nameMatches, urlMatches);
}

/**
 * A hook that performs searches using already prepared bookmark data
 * It receives prepared data from usePrepareBookmarkSearch and returns search results.
 * The prepare operation is performed only once if the data doesn't change.
 */
export const useBookmarkSearch = (params: { keyword: string; searchData: PreparedBookmarkSearch }) => {
  const { keyword, searchData } = params;
  const { searchInTags, searchInUntagged, taggedBookmarks, untaggedBookmarks } = searchData;

  return useMemo(() => {
    // Return all bookmarks if no search keyword is provided
    if (keyword === "") {
      return {
        filteredTaggedList: taggedBookmarks,
        filteredUntaggedList: untaggedBookmarks,
      };
    }

    // Process tagged bookmarks if available
    const taggedResults = searchInTags
      ? processSearchResults({
          keyword,
          searchTarget: searchInTags,
        })
      : taggedBookmarks;

    // Process untagged bookmarks if available
    const untaggedResults = searchInUntagged
      ? processSearchResults({
          keyword,
          searchTarget: searchInUntagged,
        })
      : untaggedBookmarks;

    return {
      filteredTaggedList: taggedResults,
      filteredUntaggedList: untaggedResults,
    };
  }, [searchInTags, searchInUntagged, keyword, taggedBookmarks, untaggedBookmarks]);
};
