import { useMemo } from "react";
import { Bookmark } from "../types";

/**
 * A hook that filters and sorts bookmarks based on search text using a weighted scoring system.
 * Higher scores indicate better matches, resulting in higher positions in the search results.
 *
 * Scoring examples:
 * 1. Searching for "react" in "How to Build a Chrome Extension with React":
 *    - Title partial match (+4)
 *    - Tag match (+3)
 *    Total score: 7
 *
 * Weighted scoring system:
 * - Exact title match: 5 points
 *    e.g., search "raycast" matches "Raycast Hoarder"
 * - Partial title match: 4 points
 *    e.g., "react" matches "React Tutorial"
 * - Link content matches:
 *   - Exact content title match: 4 points
 *   - Partial content title/filename match: 3 points
 *   - URL match: 3 points
 *      e.g., "github" matches "github.com/user/repo"
 *   - Description match: 2 points
 *      e.g., "typescript" matches "Built with TypeScript"
 * - Text content match: 3 points
 * - Tag match: 3 points
 *    e.g., "nextjs" matches tag ["nextjs", "react"]
 * - Note match: 2 points
 *
 * Returns filtered bookmarks sorted by their relevance score in descending order.
 */
export function useBookmarkFilter(bookmarks: Bookmark[] | undefined, searchText: string) {
  return useMemo(() => {
    if (!searchText) return bookmarks;

    const validBookmarks =
      bookmarks?.filter(
        (bookmark): bookmark is Bookmark => bookmark != null && typeof bookmark === "object" && "id" in bookmark,
      ) ?? [];

    const weighted = validBookmarks
      .map((bookmark) => {
        const searchLower = searchText.toLowerCase();
        let weight = 0;

        if (bookmark.content?.title) {
          const titleLower = bookmark.content.title.toLowerCase();
          if (titleLower === searchLower) weight += 5;
          else if (titleLower.includes(searchLower)) weight += 4;
        }

        if (bookmark.content) {
          if (bookmark.content.type === "link") {
            const urlLower = (bookmark.content.url || "").toLowerCase();
            const contentTitle = (bookmark.content.title || "").toLowerCase();
            const description = (bookmark.content.description || "").toLowerCase();

            if (contentTitle === searchLower) weight += 4;
            else if (contentTitle.includes(searchLower)) weight += 3;
            if (urlLower.includes(searchLower)) weight += 3;
            if (description.includes(searchLower)) weight += 2;
          } else if (bookmark.content.type === "text") {
            const textLower = (bookmark.content.text || "").toLowerCase();
            if (textLower.includes(searchLower)) weight += 3;
          } else if (bookmark.content.type === "asset") {
            const fileName = (bookmark.content.fileName || "").toLowerCase();
            if (fileName === searchLower) weight += 4;
            else if (fileName.includes(searchLower)) weight += 3;
          }
        }

        if (bookmark.note && bookmark.note.toLowerCase().includes(searchLower)) {
          weight += 2;
        }

        if (bookmark.tags?.some((tag) => tag.name.toLowerCase().includes(searchLower))) {
          weight += 3;
        }

        return { bookmark, weight };
      })
      .filter(({ weight }) => weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .map(({ bookmark }) => bookmark);

    return weighted;
  }, [bookmarks, searchText]);
}
