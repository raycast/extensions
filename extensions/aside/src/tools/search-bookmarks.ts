import { listBookmarks } from "../lib/browser";
import { clampLimit, filterBookmarks } from "../lib/tool-utils";

type Input = {
  /** Words that must appear in the bookmark title, URL, or folder path. */
  query: string;
  /** Maximum number of bookmarks to return, from 1 to 100. Defaults to 25. Use the smallest practical value. */
  limit?: number;
};

export default async function tool({ query, limit }: Input) {
  if (!query.trim()) throw new Error("Enter a bookmark search query.");
  return filterBookmarks(await listBookmarks(), query).slice(0, clampLimit(limit, 25));
}
