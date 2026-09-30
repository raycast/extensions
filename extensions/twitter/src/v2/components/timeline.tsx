import { TweetList } from "./tweet";
import { clientV2 } from "../lib/twitterapi_v2";
import { useTweetPage } from "../lib/tweet-page";

export function HomeTimelineListV2() {
  const { tweets, error, isLoading, pagination, fetcher } = useTweetPage(
    (_value, cursor) => clientV2.homeTimeline(cursor),
    null,
    "Could not load recent posts",
  );
  return (
    <TweetList
      isLoading={isLoading}
      tweets={tweets}
      error={error}
      fetcher={fetcher}
      pagination={pagination}
      emptyViewTitle="No Recent Posts Found"
      emptyViewDescription="Posts from accounts you follow will appear here."
    />
  );
}
