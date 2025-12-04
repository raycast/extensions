import { getBookmarks } from "../util";

type Input = {
  /** The query to search for in the bookmarks */
  query: string;
};

export default async function (input: Input) {
  if (!input.query) {
    return "Please enter a bookmark search query.";
  }

  const bookmarks = await getBookmarks();

  return bookmarks;
}
