import { fetchFeedPage } from "../lib/feeds";
import { compactFeedPage } from "../lib/format";

type Input = {
  /**
   * A post ID or post link, such as https://x.com/NASA/status/2102882545427714266.
   */
  post: string;
  /**
   * The nextCursor value of the previous call, to read the next 20 posts.
   */
  cursor?: string;
};

/**
 * List the posts in the conversation thread of an X post. Returns up to 20 posts and a nextCursor when more exist.
 */
export default async function tool({ post, cursor }: Input) {
  return compactFeedPage(await fetchFeedPage({ kind: "thread", post }, cursor));
}
