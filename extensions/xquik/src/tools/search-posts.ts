import { fetchFeedPage, SearchSort } from "../lib/feeds";
import { compactFeedPage } from "../lib/format";

type Input = {
  /**
   * Words to find, or X operators such as from:nasa, since:2024-01-01 and until:2024-12-31.
   */
  query: string;
  /**
   * The order of results. One of Latest, Top, Photos or Videos. Defaults to Latest.
   */
  sort?: SearchSort;
  /**
   * The nextCursor value of the previous call, to read the next 20 posts.
   */
  cursor?: string;
};

/**
 * Search all public X posts, with no date limit. Returns up to 20 posts and a nextCursor when more exist.
 */
export default async function tool({ query, sort = "Latest", cursor }: Input) {
  return compactFeedPage(await fetchFeedPage({ kind: "search", query, sort, filters: {} }, cursor));
}
