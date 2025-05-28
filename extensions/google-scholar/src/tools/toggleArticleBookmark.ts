import { SearchResult } from "../search-articles";
import { toggleBookmark as utilToggleBookmark, isBookmarked as utilIsBookmarked } from "../utils/bookmarks";

/**
 * Toggles the bookmark state of a given article (saves if not saved, removes if saved).
 * This is the primary tool for adding OR removing a single bookmark.
 * @param article The article object to bookmark or unbookmark. For saving, a complete SearchResult object is preferred (link, title, authors, year, publication).
 *                If only a partial object is available (e.g., from context), ensure at least `link` and `title` are present.
 * @returns An object indicating success, a message, and the new bookmark state (true if bookmarked, false if not).
 */
export default async function toggleArticleBookmark(
  article: SearchResult,
): Promise<{ success: boolean; message: string; newBookmarkState: boolean }> {
  try {
    if (!article || !article.link || !article.title) {
      // Basic validation for a usable bookmark
      return {
        success: false,
        message: "Invalid article data provided. Minimum required: link, title.",
        newBookmarkState: false,
      };
    }
    const newBookmarkState = await utilToggleBookmark(article);
    return {
      success: true,
      message: newBookmarkState ? "Article successfully bookmarked." : "Article successfully removed from bookmarks.",
      newBookmarkState,
    };
  } catch (error) {
    console.error("AI Tool (toggleArticleBookmark): Error", error);
    const currentBookmarkState = article.link ? await utilIsBookmarked(article.link) : false;
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to toggle bookmark.",
      newBookmarkState: currentBookmarkState,
    };
  }
}
