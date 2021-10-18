import { ActionPanel, Image, ImageMask, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { TweetV1 } from "twitter-api-v2";
import { twitterClient } from "./twitterapi";

export default function TweetList() {
  const { data, error, isLoading } = useSearch("");
  if (error) {
    showToast(ToastStyle.Failure, "Error", error);
  }
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter Tweets by name...">
      {data?.map((tweet) => (
        <TweetListItem key={tweet.id_str} tweet={tweet} />
      ))}
    </List>
  );
}

function TweetListItem(props: { tweet: TweetV1 }) {
  const t = props.tweet;

  const text = t.full_text ? t.full_text.trim() : "";

  const imgUrl = t.user.profile_image_url_https;
  const icon: Image | undefined = imgUrl
    ? { source: t.user.profile_image_url_https, mask: ImageMask.Circle }
    : undefined;

  const tweetUrl = `https://twitter.com/${t.user.screen_name}/status/${t.id_str}`;
  const urls = t.entities.urls;
  const hasImage = urls && urls.length > 0;
  const hasImageText = hasImage ? "🖼️ ," : "";

  return (
    <List.Item
      id={t.id_str}
      key={t.id_str}
      title={text}
      icon={icon}
      accessoryTitle={`${hasImageText}RT ${t.retweet_count}, 👍 ${t.favorite_count}`}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={tweetUrl} />
        </ActionPanel>
      }
    />
  );
}

export function useSearch(query: string | undefined): {
  data: TweetV1[] | undefined;
  error?: string;
  isLoading: boolean;
} {
  const [data, setData] = useState<TweetV1[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (query === null || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const homeTimeline = await twitterClient.v1.homeTimeline({
          exclude_replies: true,
        });
        let tweets: TweetV1[] = [];
        const tweetsRaw = await homeTimeline.fetchLast(0);
        //fs.writeFileSync("tweets.json", JSON.stringify(tweets, null, 4));
        for (const t of tweetsRaw) {
          tweets.push(t);
        }
        if (!cancel) {
          setData(tweets);
        }
      } catch (e: any) {
        if (!cancel) {
          setError(e.message);
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, []); //[query]);

  return { data, error, isLoading };
}
