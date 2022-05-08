import { showToast, Toast } from "@raycast/api";
import { TweetV2List } from "./tweet";
import { Tweet } from "../lib/twitter";
import { clientV2, useRefresher } from "../lib/twitterapi_v2";

export default function MyTweetList() {
  const { data, error, isLoading, fetcher } = useRefresher<Tweet[] | undefined>(
    async (updateInline): Promise<Tweet[] | undefined> => {
      return await clientV2.getMyTweets();
    }
  );
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  return <TweetV2List isLoading={isLoading} tweets={data} fetcher={fetcher} />;
}
