import { Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { TweetList } from "./v2/components/tweet";
import { clientV2, Fetcher } from "./v2/lib/twitterapi_v2";

export default function MentionsCommand() {
  const { data, error, isLoading, pagination, revalidate } = usePromise(
    () => async (options: { cursor?: string }) => {
      const page = await clientV2.mentions(options.cursor);
      return { data: page.items, hasMore: Boolean(page.nextToken), cursor: page.nextToken };
    },
    [],
    { failureToastOptions: { title: "Could not load mentions" } },
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
      tweets={data}
      error={error}
      isLoading={isLoading}
      fetcher={fetcher}
      pagination={pagination}
      searchBarPlaceholder="Filter mentions..."
      emptyViewTitle="No Mentions Found"
      emptyViewIcon={Icon.AtSymbol}
      emptyViewDescription="Posts that mention your X account will appear here."
    />
  );
}
