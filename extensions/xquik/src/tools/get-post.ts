import { fetchPost } from "../lib/feeds";
import { compactPost } from "../lib/format";

type Input = {
  /**
   * A post ID or post link, such as https://x.com/NASA/status/2102882545427714266.
   */
  post: string;
};

/**
 * Read 1 X post from its link or ID.
 */
export default async function tool({ post }: Input) {
  return compactPost(await fetchPost(post));
}
