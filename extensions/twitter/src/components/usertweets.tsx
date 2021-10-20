import { List, showToast, ToastStyle } from "@raycast/api";
import { TweetV1 } from "twitter-api-v2";
import { TweetListItem } from "../components/tweet";
import { refreshTweets, twitterClient, useRefresher } from "../twitterapi";

export default function UserTweetList(props: { username: string }) {
  const username = props.username;
  const { data, error, isLoading, fetcher } = useRefresher<TweetV1[] | undefined>(
    async (updateInline): Promise<TweetV1[] | undefined> => {
      return updateInline ? await refreshTweets(data) : await getTweets(username);
    }
  );
  if (error) {
    showToast(ToastStyle.Failure, "Error", error);
  }
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter Tweets by name...">
      <List.Section title={`Tweets from @${username}`}>
        {data?.map((tweet) => (
          <TweetListItem key={tweet.id_str} tweet={tweet} fetcher={fetcher} />
        ))}
      </List.Section>
    </List>
  );
}

async function getTweets(username: string): Promise<TweetV1[]> {
  const usertweets = await twitterClient.v1.userTimelineByUsername(username);
  let tweets: TweetV1[] = [];
  for (const t of usertweets.tweets) {
    tweets.push(t);
  }
  return tweets;
}
