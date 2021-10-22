import { List, showToast, ToastStyle } from "@raycast/api";
import { TweetV1 } from "twitter-api-v2";
import { TweetListItem } from "../components/tweet";
import { loggedInUserAccount, refreshTweets, twitterClient, useRefresher } from "../twitterapi";

export default function MyTweetList() {
  const { data, error, isLoading, fetcher } = useRefresher<TweetV1[] | undefined>(
    async (updateInline): Promise<TweetV1[] | undefined> => {
      return updateInline ? await refreshTweets(data) : await getMyTweets();
    }
  );
  if (error) {
    showToast(ToastStyle.Failure, "Error", error);
  }
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter My Tweets by name...">
      {data?.map((tweet) => (
        <TweetListItem key={tweet.id_str} tweet={tweet} fetcher={fetcher} />
      ))}
    </List>
  );
}

async function getMyTweets(): Promise<TweetV1[]> {
  const account = await loggedInUserAccount();
  const mytweets = await twitterClient.v1.userTimelineByUsername(account.screen_name);
  const tweets: TweetV1[] = [];
  for (const t of mytweets.tweets) {
    tweets.push(t);
  }
  return tweets;
}
