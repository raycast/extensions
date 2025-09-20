import { showToast, Toast } from "@raycast/api";
import { TweetList } from "./tweet";
import { Tweet } from "../lib/twitter";
import { clientV2, useRefresher } from "../lib/twitterapi_v2";

export function AuthorTweetList(props: { authorID: string }) {
  const { data, error, isLoading, fetcher } = useRefresher<Tweet[] | undefined>(
    async (): Promise<Tweet[] | undefined> => {
      return await clientV2.getTweetsFromAuthor(props.authorID);
    },
  );
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  return <TweetList isLoading={isLoading} tweets={data} fetcher={fetcher} />;
}
