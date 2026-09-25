import { TweetList } from "./tweet";
import { clientV2 } from "../lib/twitterapi_v2";
import { useTweetPage } from "../lib/tweet-page";

export function AuthorTweetList(props: { authorID: string }) {
  const { tweets, error, isLoading, pagination, fetcher } = useTweetPage(
    (authorId, cursor) => clientV2.getTweetsFromAuthor(authorId, [], cursor),
    props.authorID,
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
    />
  );
}
