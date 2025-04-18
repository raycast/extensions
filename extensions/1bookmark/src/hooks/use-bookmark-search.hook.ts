import fuzzysort from "fuzzysort";
import { Bookmark, RankingDatas } from "../types";
import { useMemo } from "react";
import { PreparedBookmark } from "./use-prepare-bookmark-search.hook";

// Maximum number of search results
const MAX_SEARCH_RESULTS = 30;

// Weight for ranking data influence (configurable)
const RANKING_DATA_WEIGHT = 0.08;

/**
 * Function to calculate ranking score boost for a bookmark
 */
function calculateRankingScoreBoost(params: {
  bookmark: Bookmark;
  keyword: string;
  rankingDatas: RankingDatas;
}): number {
  const { bookmark, keyword, rankingDatas } = params;

  // Check if the bookmark exists in ranking data
  const rankingData = rankingDatas[bookmark.id];
  if (!rankingData) return 0;

  // Find the matching ranking entry for the keyword
  const matchings = rankingData.filter((e) => e.keyword.startsWith(keyword));

  if (matchings.length === 0) return 0;

  // Return boosted score based on count and weight
  return matchings.reduce((acc, curr) => {
    return acc + curr.count * RANKING_DATA_WEIGHT * (keyword.length / curr.keyword.length);
  }, 0);
}

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
function combineSearchResults(params: {
  searchResults: Array<Array<{ item: Bookmark; score: number }>>;
  keyword: string;
  rankingDatas: RankingDatas;
}) {
  const { searchResults, keyword, rankingDatas } = params;

  // Combine all search results into a single array
  const allMatches = searchResults.flat();

  // Remove duplicates and keep the highest score
  const uniqueMatches = new Map<string, { item: Bookmark; score: number }>();

  for (const match of allMatches) {
    const id = match.item.id;
    const existingMatch = uniqueMatches.get(id);

    let rankingBoost = 0;

    if (keyword.length > 1) {
      // Calculate ranking score boost
      rankingBoost = calculateRankingScoreBoost({
        bookmark: match.item,
        keyword,
        rankingDatas,
      });
    }

    const totalScore = match.score + rankingBoost;

    if (!existingMatch || totalScore > existingMatch.score) {
      uniqueMatches.set(id, { item: match.item, score: totalScore });
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
  rankingDatas: RankingDatas;
}) {
  const { keyword, preparedBookmarks, bookmarks, rankingDatas } = params;

  const nameMatches = searchByField({ keyword, key: "name", preparedBookmarks, bookmarks });
  const urlMatches = searchByField({ keyword, key: "url", preparedBookmarks, bookmarks });

  // 0.25 점 아래인것은 버린다.
  const filteredNameMatches = nameMatches.filter((match) => match.score >= 0.25);
  const filteredUrlMatches = urlMatches.filter((match) => match.score >= 0.25);

  // Combine and sort search results (add new fields here when needed)
  return combineSearchResults({
    searchResults: [filteredNameMatches, filteredUrlMatches],
    keyword,
    rankingDatas,
  });
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
  rankingDatas: RankingDatas;
}): {
  searchedTaggedList: Bookmark[];
  searchedUntaggedList: Bookmark[];
  hasSearch: boolean;
} => {
  const { keyword, taggedPrepare, untaggedPrepare, taggedBookmarks, untaggedBookmarks, rankingDatas } = params;

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
      rankingDatas,
    });

    // Process untagged bookmarks if available
    const untaggedResults = processSearchResults({
      keyword,
      preparedBookmarks: untaggedPrepare,
      bookmarks: untaggedBookmarks,
      rankingDatas,
    });

    return {
      searchedTaggedList: taggedResults,
      searchedUntaggedList: untaggedResults,
      hasSearch: true,
    };
  }, [keyword, taggedBookmarks, untaggedBookmarks, taggedPrepare, untaggedPrepare, rankingDatas]);
};
