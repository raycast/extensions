import { fetchFeedPage } from "../lib/feeds";
import { compactFeedPage } from "../lib/format";

type Input = {
  /**
   * A username, @username, numeric user ID or profile link.
   */
  user: string;
  /**
   * The nextCursor value of the previous call, to read the next 20 posts.
   */
  cursor?: string;
};

/**
 * List public posts that mention an X account. Returns up to 20 posts and a nextCursor when more exist.
 */
export default async function tool({ user, cursor }: Input) {
  return compactFeedPage(await fetchFeedPage({ kind: "mentions", user }, cursor));
}
