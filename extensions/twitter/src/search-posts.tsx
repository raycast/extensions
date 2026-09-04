import { LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { TweetList } from "./v2/components/tweet";
import { clientV2, Fetcher } from "./v2/lib/twitterapi_v2";

interface Arguments {
  query?: string;
}

export default function SearchPostsCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const [query, setQuery] = useState(props.arguments.query?.trim() ?? props.fallbackText?.trim() ?? "");
  const normalizedQuery = query.trim();
  const { data, error, isLoading, pagination, revalidate } = usePromise(
    (searchQuery: string) => async (options: { cursor?: string }) => {
      const page = await clientV2.searchPosts(searchQuery, options.cursor);
      return { data: page.items, hasMore: Boolean(page.nextToken), cursor: page.nextToken };
    },
    [normalizedQuery],
    { execute: normalizedQuery.length > 0 },
  );
  const refresh = async () => {
    await revalidate();
  };
  const fetcher: Fetcher = { updateInline: refresh, refresh };

  return (
    <TweetList
      tweets={data}
      error={error}
      isLoading={isLoading}
      fetcher={normalizedQuery ? fetcher : undefined}
      pagination={normalizedQuery ? pagination : undefined}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search posts from the last seven days..."
      filtering={false}
      errorViewTitle="Could Not Search Posts"
      emptyViewTitle={normalizedQuery ? "No Posts Found" : "Search Recent Posts"}
      emptyViewDescription={
        normalizedQuery
          ? "Try another query or fewer search operators."
          : "Enter keywords or X search operators to search posts from the last seven days."
      }
    />
  );
}
