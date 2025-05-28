import { isBookmarked as utilIsBookmarked } from "../utils/bookmarks";

/**
 * Checks if a specific article is currently bookmarked.
 * @param articleLink The unique link (URL) of the article to check.
 * @returns An object indicating whether the article is bookmarked, success status, and an optional message.
 */
export default async function checkIfArticleIsBookmarked(
  articleLink: string,
): Promise<{ isBookmarked: boolean; success: boolean; message?: string }> {
  try {
    if (!articleLink || typeof articleLink !== "string" || !articleLink.trim()) {
      return { isBookmarked: false, success: false, message: "Valid article link (URL string) is required." };
    }
    const isBookmarked = await utilIsBookmarked(articleLink.trim());
    return { isBookmarked, success: true };
  } catch (error) {
    console.error("AI Tool (checkIfArticleIsBookmarked): Error", error);
    return {
      isBookmarked: false,
      success: false,
      message: error instanceof Error ? error.message : "Failed to check bookmark status.",
    };
  }
}
