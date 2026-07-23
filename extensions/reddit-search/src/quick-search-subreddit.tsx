import { LaunchProps, open } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { createSearchUrl } from "./RedditApi/UrlBuilder";
import { normalizeSubredditSlug, subredditPath } from "./util/subreddit";
import { failureToast } from "./util/toast";

const log = logger.child("[QuickSearchSubreddit]");

/**
 * No-view command: takes a query and a subreddit, opens a subreddit-restricted
 * search on Reddit in the browser.
 *
 * A no-view command can't render results, and Reddit's ~1/minute feed limit would
 * make an in-Raycast fetch unreliable anyway — so this always opens the browser,
 * the one path that works every time. The subreddit accepts `r/foo`, `/r/foo`, a
 * pasted URL, etc., normalized to a bare slug.
 */
export default async function QuickSearchSubreddit(props: LaunchProps<{ arguments: Arguments.QuickSearchSubreddit }>) {
  const query = props.arguments.query.trim();
  const slug = normalizeSubredditSlug(props.arguments.subreddit);

  if (!slug) {
    await failureToast("Enter a subreddit", "Couldn’t read a subreddit name from that input.");
    return;
  }

  try {
    const url = createSearchUrl(subredditPath(slug), false, query, "", 0, "");
    log.debug("opening subreddit search", { slug, query, url });
    await open(url);
  } catch (error) {
    log.error("Quick subreddit search failed", error);
    await failureToast(`Couldn’t open search for r/${slug}`, error);
  }
}
