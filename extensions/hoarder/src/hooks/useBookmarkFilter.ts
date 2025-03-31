import { useMemo } from "react";
import { Bookmark } from "../types";

/**
 * A hook that filters and sorts bookmarks based on search text using a weighted scoring system.
 * Higher scores indicate better matches, resulting in higher positions in the search results.
 *
 * Scoring weights:
 * - Title exact match: 10 points
 * - Title partial match: 8 points
 * - Summary match: 6 points
 * - Content matches:
 *   - Link type:
 *     - Title exact match: 5 points
 *     - Title partial match: 4 points
 *     - URL match: 3 points
 *     - Description match: 2 points
 *   - Text type:
 *     - Content match: 3 points
 *   - Asset type:
 *     - Filename match: 3 points
 * - Tags match: 4 points
 * - Note match: 2 points
 */
export function useBookmarkFilter(bookmarks: Bookmark[] | undefined, searchText: string) {
  return useMemo(() => {
    if (!searchText) return bookmarks;
    if (!bookmarks?.length) return [];

    const searchLower = searchText.toLowerCase().trim();
    if (!searchLower) return bookmarks;

    const getWeight = (bookmark: Bookmark): number => {
      let weight = 0;

      // Title matching (highest priority)
      if (bookmark.title) {
        const titleLower = bookmark.title.toLowerCase();
        if (titleLower === searchLower) weight += 10;
        else if (titleLower.includes(searchLower)) weight += 8;
      }

      // Note matching
      if (bookmark.note?.toLowerCase().includes(searchLower)) {
        weight += 7;
      }

      // Summary matching (high priority)
      if (bookmark.summary) {
        const summaryLower = bookmark.summary.toLowerCase();
        if (summaryLower.includes(searchLower)) weight += 6;
      }

      // Content matching (medium priority)
      if (bookmark.content) {
        switch (bookmark.content.type) {
          case "link": {
            const contentTitle = bookmark.content.title?.toLowerCase() || "";
            const url = bookmark.content.url?.toLowerCase() || "";
            const description = bookmark.content.description?.toLowerCase() || "";

            if (contentTitle === searchLower) weight += 5;
            else if (contentTitle.includes(searchLower)) weight += 4;
            if (url.includes(searchLower)) weight += 3;
            if (description.includes(searchLower)) weight += 2;
            break;
          }
          case "text":
            if (bookmark.content.text?.toLowerCase().includes(searchLower)) {
              weight += 3;
            }
            break;

          case "asset":
            if (bookmark.content.fileName?.toLowerCase().includes(searchLower)) {
              weight += 3;
            }
            break;
        }
      }

      // Tags matching
      if (bookmark.tags?.some((tag) => tag.name.toLowerCase().includes(searchLower))) {
        weight += 4;
      }

      return weight;
    };

    // Filter and sort bookmarks based on weights
    return bookmarks
      .map((bookmark) => ({
        bookmark,
        weight: getWeight(bookmark),
      }))
      .filter(({ weight }) => weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .map(({ bookmark }) => bookmark);
  }, [bookmarks, searchText]);
}
