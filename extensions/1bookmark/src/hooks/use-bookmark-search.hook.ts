import fuzzysort from "fuzzysort";
import { Bookmark, RankingEntries } from "../types";
import { useMemo } from "react";
import { PreparedBookmark } from "./use-prepare-bookmark-search.hook";

// Maximum number of search results
const MAX_SEARCH_RESULTS = 30;

// Discard name/url matches with score below this
const FIELD_SCORE_THRESHOLD = 0.25;

// Weight for ranking entry influence (configurable)
const RANKING_ENTRY_WEIGHT = 0.08;

// Tag-name matching (#464): a miss-prevention net, not a ranking bonus.
// Tags are short, so scattered-letter fuzzy matches (e.g. "cat" → "raycast", 0.34) are noisy;
// only prefix/substring-level matches (score >= 0.5) count. Only bookmarks with no name/URL
// match are included, scored as `tag score * TAG_ONLY_WEIGHT`. The maximum (1.0 * 0.2) stays
// below FIELD_SCORE_THRESHOLD (0.25), so tag-only matches always rank below every name/URL match.
const TAG_SCORE_THRESHOLD = 0.5;
const TAG_ONLY_WEIGHT = 0.2;

type ScoredBookmark = { item: Bookmark; score: number };

/**
 * Function to calculate ranking score boost for a bookmark
 */
function calculateRankingScoreBoost(params: {
  bookmark: Bookmark;
  keyword: string;
  rankingEntries: RankingEntries;
}): number {
  const { bookmark, keyword, rankingEntries } = params;

  // Check if the bookmark exists in ranking entries
  const rankingEntry = rankingEntries[bookmark.id];
  if (!rankingEntry) return 0;

  const matchings = rankingEntry.filter((e) => e.keyword.startsWith(keyword));

  if (matchings.length === 0) return 0;

  // Return boosted score based on count and weight
  return matchings.reduce((acc, curr) => {
    return acc + curr.count * RANKING_ENTRY_WEIGHT * (keyword.length / curr.keyword.length);
  }, 0);
}

/**
 * Function to search by a single field (name or URL)
 */
function searchByField(params: {
  keyword: string;
  key: "preparedName" | "preparedUrl";
  preparedBookmarks: PreparedBookmark[];
  bookmarks: Bookmark[];
}): ScoredBookmark[] {
  const { keyword, key, preparedBookmarks, bookmarks } = params;

  // Execute search
  const results = fuzzysort.go(keyword, preparedBookmarks, {
    key,
    limit: MAX_SEARCH_RESULTS,
    threshold: FIELD_SCORE_THRESHOLD,
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
 * Function to search by tag names.
 * Each bookmark gets the score of its best-matching tag.
 */
function searchByTags(params: {
  keyword: string;
  preparedBookmarks: PreparedBookmark[];
  bookmarks: Bookmark[];
}): ScoredBookmark[] {
  const { keyword, preparedBookmarks, bookmarks } = params;

  const tagEntries = preparedBookmarks.flatMap((bookmark) =>
    bookmark.preparedTags.map((tag) => ({ tag, originalIndex: bookmark.originalIndex })),
  );
  if (tagEntries.length === 0) return [];

  const results = fuzzysort.go(keyword, tagEntries, {
    key: "tag",
    threshold: TAG_SCORE_THRESHOLD,
  });

  // Keep the best tag score per bookmark
  const bestByIndex = new Map<number, number>();
  for (const result of results) {
    const { originalIndex } = result.obj;
    const existing = bestByIndex.get(originalIndex);
    if (existing === undefined || result.score > existing) {
      bestByIndex.set(originalIndex, result.score);
    }
  }

  return Array.from(bestByIndex.entries()).map(([originalIndex, score]) => ({
    item: bookmarks[originalIndex],
    score,
  }));
}

/**
 * Function to combine search results from multiple fields and remove duplicates
 * - name/url: the highest score among fields is used as the base score
 * - tags: bookmarks matched only by tag are included with a low score (miss prevention, not a bonus)
 * - ranking entries: added as a bonus based on the user's past selections
 */
function combineSearchResults(params: {
  fieldResults: ScoredBookmark[][];
  tagResults: ScoredBookmark[];
  keyword: string;
  rankingEntries: RankingEntries;
}) {
  const { fieldResults, tagResults, keyword, rankingEntries } = params;

  const uniqueMatches = new Map<string, ScoredBookmark>();

  // Remove duplicates and keep the highest score
  for (const match of fieldResults.flat()) {
    const id = match.item.id;
    const existingMatch = uniqueMatches.get(id);
    if (!existingMatch || match.score > existingMatch.score) {
      uniqueMatches.set(id, { item: match.item, score: match.score });
    }
  }

  // Tag matches only prevent misses: bookmarks already matched by name/URL get no extra
  // points, and tag-only matches are appended below every name/URL match.
  for (const match of tagResults) {
    const id = match.item.id;
    if (uniqueMatches.has(id)) continue;
    uniqueMatches.set(id, { item: match.item, score: match.score * TAG_ONLY_WEIGHT });
  }

  // Add ranking boost
  if (keyword.length > 1) {
    for (const match of uniqueMatches.values()) {
      match.score += calculateRankingScoreBoost({ bookmark: match.item, keyword, rankingEntries });
    }
  }

  // Sort by score and get final results
  return Array.from(uniqueMatches.values())
    .sort((a, b) => b.score - a.score)
    .map((match) => match.item);
}

/**
 * Helper function to process search results
 * Performs searches for name, URL and tags separately and combines the results
 */
function processSearchResults(params: {
  keyword: string;
  preparedBookmarks: PreparedBookmark[];
  bookmarks: Bookmark[];
  rankingEntries: RankingEntries;
}) {
  const { keyword, preparedBookmarks, bookmarks, rankingEntries } = params;

  const nameMatches = searchByField({ keyword, key: "preparedName", preparedBookmarks, bookmarks });
  const urlMatches = searchByField({ keyword, key: "preparedUrl", preparedBookmarks, bookmarks });
  const tagMatches = searchByTags({ keyword, preparedBookmarks, bookmarks });

  // Combine and sort search results (add new fields here when needed)
  return combineSearchResults({
    fieldResults: [nameMatches, urlMatches],
    tagResults: tagMatches,
    keyword,
    rankingEntries,
  });
}

/**
 * A hook that performs searches using already prepared bookmark data
 * It receives prepared data from usePrepareBookmarkSearch and returns search results.
 * The prepare operation is performed only once if the data doesn't change.
 */
export const useBookmarkSearch = (params: {
  keyword: string;
  prepared: PreparedBookmark[];
  bookmarks: Bookmark[];
  rankingEntries: RankingEntries;
}): {
  searchedList: Bookmark[];
  hasSearch: boolean;
} => {
  const { keyword, prepared, bookmarks, rankingEntries } = params;

  return useMemo(() => {
    // Return all bookmarks if no search keyword is provided
    if (keyword === "") {
      return {
        searchedList: prepared.map((r) => bookmarks[r.originalIndex]),
        hasSearch: false,
      };
    }

    return {
      searchedList: processSearchResults({
        keyword,
        preparedBookmarks: prepared,
        bookmarks,
        rankingEntries,
      }),
      hasSearch: true,
    };
  }, [keyword, bookmarks, prepared, rankingEntries]);
};
