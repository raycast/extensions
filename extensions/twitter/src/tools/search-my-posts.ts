import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** One to eight words, usernames, names, or short phrases that must all match. Keep alternatives out of the list and retry with them only if needed. */
  terms: string[];
  /** Maximum matching posts to return. Defaults to 20 and must be between 1 and 100. */
  limit?: number;
};

/**
 * Search the authenticated user's retrievable post history, including replies. This paginates through up to X's
 * 3,200 most recent authored posts, excludes reposts, and matches post text plus mentioned users' names and usernames.
 */
export default async function searchMyPosts(input: Input) {
  return await clientV2.searchMyPosts(input.terms, input.limit);
}
