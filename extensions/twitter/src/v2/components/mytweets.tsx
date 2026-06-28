import { showToast, Toast } from "@raycast/api";
import { TweetList } from "./tweet";
import { Tweet } from "../lib/twitter";
import { clientV2, useRefresher } from "../lib/twitterapi_v2";
import { hasRestrictedAccess } from "../../common";
import { SubscriptionInfo } from "./subscription";

export function MyTweetListV2() {
  if (hasRestrictedAccess()) {
    return <SubscriptionInfo />;
  }
  const { data, error, isLoading, fetcher } = useRefresher<Tweet[] | undefined>(
    async (updateInline): Promise<Tweet[] | undefined> => {
      return updateInline ? await clientV2.refreshTweets(data) : await clientV2.getMyTweets();
    },
  );
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  return <TweetList isLoading={isLoading} tweets={data} fetcher={fetcher} />;
}
