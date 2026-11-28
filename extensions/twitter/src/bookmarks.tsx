import { withXAuth } from "./v2/lib/with_x_auth";
import { Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { TweetList } from "./v2/components/tweet";
import "./v2/components/register-post-views";
import { filterBookmarks } from "./v2/lib/bookmark_search";
import { refreshingFetcher } from "./v2/lib/tweet-page";
import { clientV2 } from "./v2/lib/twitterapi_v2";

function BookmarksCommand() {
  const [query, setQuery] = useState("");
  const { data, error, isLoading, pagination, revalidate } = usePromise(
    () => async (options: { cursor?: string }) => {
      const page = await clientV2.bookmarks(options.cursor);
      return { data: page.items, hasMore: Boolean(page.nextToken), cursor: page.nextToken };
    },
    [],
    { failureToastOptions: { title: "Could not load bookmarks" } },
  );

  const fetcher = refreshingFetcher(revalidate);

  return (
    <TweetList
      tweets={filterBookmarks(data, query)}
      error={error}
      isLoading={isLoading}
      fetcher={fetcher}
      pagination={pagination}
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      searchBarPlaceholder="Filter bookmarked posts..."
      emptyViewTitle={query.trim() ? "No Matching Bookmarks" : "No Bookmarks Found"}
      emptyViewIcon={Icon.Bookmark}
      emptyViewDescription={
        query.trim()
          ? "Try another search, or load more bookmarks to search older posts."
          : "Posts you bookmark on X will appear here."
      }
    />
  );
}

export default withXAuth(BookmarksCommand);
