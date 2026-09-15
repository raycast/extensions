import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** X recent-search query. Supports X search operators. Searches only the last seven days. */
  query: string;
  /** Opaque continuation token returned by a preceding search-posts call. Only pass it when the user explicitly asks for more results. */
  nextToken?: string;
};

/** Search one page of recent X posts from the last seven days. */
export default async function searchPosts(input: Input) {
  const query = input.query.trim();
  if (!query) throw new Error("A non-empty search query is required.");
  return await clientV2.searchPosts(query, input.nextToken);
}
