import { TweetList } from "./tweet";
import { clientV2 } from "../lib/twitterapi_v2";
import { useTweetPage } from "../lib/tweet-page";

export function MyTweetListV2() {
  const { tweets, error, isLoading, pagination, fetcher } = useTweetPage(
    (_value, cursor) => clientV2.getMyTweets(cursor),
    null,
    "Could not load your posts",
  );
  return (
    <TweetList
      isLoading={isLoading}
      tweets={tweets}
      error={error}
      fetcher={fetcher}
      pagination={pagination}
      emptyViewTitle="No Posts Found"
      emptyViewDescription="Posts you publish on X will appear here."
    />
  );
}
