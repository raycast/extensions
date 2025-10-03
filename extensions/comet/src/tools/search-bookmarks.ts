import { getBookmarks, getAvailableProfiles, resolveProfileName } from "../util";
import { MAX_BOOKMARK_RESULTS } from "../constants";

type Input = {
  /** The query to search for in the bookmarks (optional, returns all bookmarks if empty) */
  query?: string;
  /** The profile to search in (optional, defaults to "Default") */
  profile?: string;
};

export default async function (input: Input) {
  try {
    // Resolve profile name (e.g., "Test" -> "Profile 3")
    const resolvedProfile = resolveProfileName(input.profile);
    const bookmarks = await getBookmarks(resolvedProfile, MAX_BOOKMARK_RESULTS);

    // If no query provided, return all bookmarks (already limited by MAX_BOOKMARK_RESULTS)
    if (!input.query || input.query.trim() === "") {
      return bookmarks;
    }

    // Filter bookmarks based on the query
    const query = input.query.toLowerCase();
    const filteredBookmarks = bookmarks.filter(
      (bookmark) => bookmark.title.toLowerCase().includes(query) || bookmark.url.toLowerCase().includes(query),
    );

    return filteredBookmarks;
  } catch (error) {
    // Get available profiles to help user
    const availableProfiles = getAvailableProfiles();
    return `Error: ${
      error instanceof Error ? error.message : "Unknown error occurred"
    }. Available profiles are: ${availableProfiles.join(", ")}. Try using one of these profile names.`;
  }
}
