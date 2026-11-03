import { ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ReactNode } from "react";
import { showErrorToast } from "../lib/error-toast";
import { feedKey, fetchFeedPage, PostFeed, uniqueById } from "../lib/feeds";
import { ErrorView } from "./error-view";
import { PostListItem } from "./post-list-item";
import { IdleSearchView, SearchAction, SubmittedSearch } from "./submitted-search";

type PostFeedListProps = {
  feed: PostFeed;
  navigationTitle?: string;
  search?: SubmittedSearch;
  searchBarAccessory?: List.Props["searchBarAccessory"];
};

const NO_POSTS_HINTS: Record<PostFeed["kind"], string> = {
  search: "Try different words or filters.",
  userPosts: "This account has no public posts.",
  mentions: "No public posts mention this account.",
  replies: "This post has no replies yet.",
  quotes: "This post has no quotes yet.",
  thread: "This post has no thread.",
};

const loadFeedPage =
  (feed: PostFeed) =>
  async ({ cursor }: { cursor?: string }) => {
    const { posts, nextCursor } = await fetchFeedPage(feed, cursor);
    return { data: posts, hasMore: nextCursor !== undefined, cursor: nextCursor };
  };

export function PostFeedList({ feed, navigationTitle, search, searchBarAccessory }: PostFeedListProps) {
  const isIdle = search?.submitted === "";
  const { data, error, isLoading, pagination, revalidate } = useCachedPromise(loadFeedPage, [feed], {
    execute: !isIdle,
    onError: (failure) => {
      showErrorToast(failure, revalidate);
    },
  });
  const isWaiting = !isIdle && (isLoading || (!data && !error));
  const posts = uniqueById(data ?? []);
  const key = feedKey(feed);
  const searchAction: ReactNode = search && <SearchAction search={search} />;
  const searchBar = search
    ? {
        filtering: false,
        searchText: search.draft,
        onSearchTextChange: search.setDraft,
        searchBarPlaceholder: "Search Posts",
      }
    : { searchBarPlaceholder: "Filter Posts" };

  function emptyView() {
    if (isWaiting) return null;
    if (search && isIdle) return <IdleSearchView search={search} />;
    if (error) return <ErrorView error={error} onRetry={revalidate} firstAction={searchAction} />;
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Posts Found"
        description={NO_POSTS_HINTS[feed.kind]}
        actions={<ActionPanel>{searchAction}</ActionPanel>}
      />
    );
  }

  return (
    <List
      isLoading={isWaiting}
      isShowingDetail={posts.length > 0}
      navigationTitle={navigationTitle}
      pagination={pagination}
      searchBarAccessory={searchBarAccessory}
      {...searchBar}
    >
      {emptyView()}
      {posts.map((post) => (
        <PostListItem key={`${key}:${post.id}`} post={post} firstAction={searchAction} />
      ))}
    </List>
  );
}
