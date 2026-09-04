import { usePromise } from "@raycast/utils";
import { TweetList } from "./tweet";
import { clientV2, Fetcher } from "../lib/twitterapi_v2";

export function HomeTimelineListV2() {
  const { data, error, isLoading, pagination, revalidate } = usePromise(
    () => async (options: { cursor?: string }) => {
      const page = await clientV2.homeTimeline(options.cursor);
      return { data: page.items, hasMore: Boolean(page.nextToken), cursor: page.nextToken };
    },
    [],
    { failureToastOptions: { title: "Could not load recent posts" } },
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
      emptyViewTitle="No Recent Posts Found"
      emptyViewDescription="Posts from accounts you follow will appear here."
    />
  );
}
