import { getBookmarks as utilGetBookmarks, BookmarkedArticle } from "../utils/bookmarks";

/**
 * Retrieves all currently saved bookmarked articles.
 * @returns A list of bookmarked articles or an error object.
 */
export default async function getSavedBookmarks(): Promise<{
  success: boolean;
  bookmarks?: BookmarkedArticle[];
  message?: string;
}> {
  try {
    const bookmarks = await utilGetBookmarks();
    return { success: true, bookmarks };
  } catch (error) {
    console.error("AI Tool (getSavedBookmarks): Error", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to retrieve bookmarks.",
    };
  }
}
