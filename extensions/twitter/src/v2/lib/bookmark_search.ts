import { Tweet } from "./twitter";
import { normalizeSearchTerms, scoreSearchCandidate } from "./post_search";

/**
 * Filter loaded bookmarks without Raycast's fuzzy matching across long post bodies.
 * Every query term must occur contiguously in the post text, author name, or username.
 */
export function filterBookmarks(bookmarks: Tweet[] | undefined, query: string): Tweet[] | undefined {
  if (!bookmarks) return undefined;

  const terms = normalizeSearchTerms(query.split(/\s+/u));
  if (terms.length === 0) return bookmarks;

  return bookmarks.filter((bookmark) => {
    const fields = [bookmark.text, bookmark.user.name, bookmark.user.username];
    return terms.every((term) =>
      fields.some((field) => scoreSearchCandidate({ fields: [field] }, [term]) !== undefined),
    );
  });
}
