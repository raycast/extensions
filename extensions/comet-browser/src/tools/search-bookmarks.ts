import { getBookmarks } from "../util";

type Input = {
  /** The query to search for in bookmarks. */
  query?: string;
};

export default async function (input: Input) {
  const bookmarks = await getBookmarks();

  if (input.query) {
    const filteredBookmarks = bookmarks.filter(
      (bookmark) =>
        bookmark.title.toLowerCase().includes(input.query!.toLowerCase()) ||
        bookmark.url.toLowerCase().includes(input.query!.toLowerCase()),
    );
    return filteredBookmarks;
  }

  return bookmarks;
}
