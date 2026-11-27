import { readBookmarks } from "../lib/data";
import { matchesQuery } from "../lib/utils";

type Input = {
  /** Search terms to filter bookmarks by title, URL, or folder name. */
  query?: string;
  /** Maximum number of bookmarks to return (default: 25). */
  limit?: number;
};

export default async function tool(input: Input = {}) {
  const query = input.query?.trim() ?? "";
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const bookmarks = readBookmarks()
    .filter((bm) => matchesQuery(query, bm.title, bm.url, bm.folderLabel))
    .slice(0, limit);

  return {
    count: bookmarks.length,
    bookmarks: bookmarks.map((bm) => ({
      title: bm.title,
      url: bm.url,
      folder: bm.folderLabel,
    })),
  };
}
