import { usePromise } from "@raycast/utils";
import { TweetList } from "./tweet";
import { clientV2, Fetcher } from "../lib/twitterapi_v2";

export function MyTweetListV2() {
  const { data, error, isLoading, pagination, revalidate } = usePromise(
    () => async (options: { cursor?: string }) => {
      const page = await clientV2.getMyTweets(options.cursor);
      return { data: page.items, hasMore: Boolean(page.nextToken), cursor: page.nextToken };
    },
    [],
    { failureToastOptions: { title: "Could not load your posts" } },
  );
  const fetcher: Fetcher = {
    updateInline: async () => {
      clientV2.clearCache();
      await revalidate();
    },
    refresh: async () => {
      clientV2.clearCache();
      await revalidate();
    },
  };
  return (
    <TweetList
      isLoading={isLoading}
      tweets={data}
      error={error}
      fetcher={fetcher}
      pagination={pagination}
      emptyViewTitle="No Posts Found"
      emptyViewDescription="Posts you publish on X will appear here."
    />
  );
}
