import { searchBookmarks } from "../lib/bookmarks";
import { clampLimit, requireNonEmpty } from "../lib/tool-input";

type Input = {
  /** Required multiword query matched against bookmark title, URL, and folder path. */
  query: string;
  /** Maximum bookmark results to return. Defaults to 20 and is clamped from 1 through 50. */
  limit?: number;
};

/** Search bookmarks in the configured Aside profile. */
export default async function tool(input: Input) {
  const query = requireNonEmpty(input.query, "Query");
  const limit = clampLimit(input.limit, 20, 50);
  const result = await searchBookmarks(query, limit);
  return {
    totalMatches: result.totalMatches,
    returned: result.bookmarks.length,
    truncated: result.bookmarks.length < result.totalMatches,
    bookmarks: result.bookmarks.map((bookmark) => ({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      folder: bookmark.folder ?? null,
    })),
  };
}
