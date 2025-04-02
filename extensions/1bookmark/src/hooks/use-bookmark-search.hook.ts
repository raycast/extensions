import fuzzysort from "fuzzysort";
import { Bookmark } from "../types";
import { useMemo } from "react";
import { PreparedBookmark } from "./use-prepare-bookmark-search.hook";

// Maximum number of search results
const MAX_SEARCH_RESULTS = 30;

/**
 * Function to search by a single field (name or URL)
 */
function searchByField(params: {
  keyword: string;
  key: "name" | "url";
  preparedBookmarks: PreparedBookmark[];
  bookmarks: Bookmark[];
}) {
  const { keyword, key, preparedBookmarks, bookmarks } = params;

  // Execute search
  const results = fuzzysort.go(keyword, preparedBookmarks, {
    key,
    limit: MAX_SEARCH_RESULTS,
    threshold: 0.25,
  });

  // Find original bookmarks from search results
  return results.map((result) => {
    const originalIndex = result.obj.originalIndex;
    return {
      item: bookmarks[originalIndex],
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
  preparedBookmarks: PreparedBookmark[];
  bookmarks: Bookmark[];
}) {
  const { keyword, preparedBookmarks, bookmarks } = params;

  const nameMatches = searchByField({ keyword, key: "name", preparedBookmarks, bookmarks });
  const urlMatches = searchByField({ keyword, key: "url", preparedBookmarks, bookmarks });

  // 0.25 점 아래인것은 버린다.
  const filteredNameMatches = nameMatches.filter((match) => match.score >= 0.25);
  const filteredUrlMatches = urlMatches.filter((match) => match.score >= 0.25);

  // Combine and sort search results (add new fields here when needed)
  return combineSearchResults(filteredNameMatches, filteredUrlMatches);
}

/**
 * A hook that performs searches using already prepared bookmark data
 * It receives prepared data from usePrepareBookmarkSearch and returns search results.
 * The prepare operation is performed only once if the data doesn't change.
 */
export const useBookmarkSearch = (params: {
  keyword: string;
  taggedPrepare: PreparedBookmark[];
  untaggedPrepare: PreparedBookmark[];
  taggedBookmarks: Bookmark[];
  untaggedBookmarks: Bookmark[];
}): {
  searchedTaggedList: Bookmark[];
  searchedUntaggedList: Bookmark[];
  hasSearch: boolean;
} => {
  const { keyword, taggedPrepare, untaggedPrepare, taggedBookmarks, untaggedBookmarks } = params;

  return useMemo(() => {
    // Return all bookmarks if no search keyword is provided
    if (keyword === "") {
      return {
        searchedTaggedList: taggedPrepare.map((r) => taggedBookmarks[r.originalIndex]),
        searchedUntaggedList: untaggedPrepare.map((r) => untaggedBookmarks[r.originalIndex]),
        hasSearch: false,
      };
    }

    // Process tagged bookmarks if available
    const taggedResults = processSearchResults({
      keyword,
      preparedBookmarks: taggedPrepare,
      bookmarks: taggedBookmarks,
    });

    // Process untagged bookmarks if available
    const untaggedResults = processSearchResults({
      keyword,
      preparedBookmarks: untaggedPrepare,
      bookmarks: untaggedBookmarks,
    });

    return {
      searchedTaggedList: taggedResults,
      searchedUntaggedList: untaggedResults,
      hasSearch: true,
    };
  }, [keyword, taggedBookmarks, untaggedBookmarks, taggedPrepare, untaggedPrepare]);
};
