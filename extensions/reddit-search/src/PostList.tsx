import { ActionPanel, Action, Icon, List } from "@raycast/api";
import RedditResultItem from "./RedditApi/RedditResultItem";
import PostActionPanel from "./PostActionPanel";
import PostDetail from "./PostDetail";
import ToggleDetailAction from "./ToggleDetailAction";
import RefreshAction from "./RefreshAction";
import { relativeTime, absoluteTime } from "./util/formatDate";
import { describeCacheAge } from "./util/searchCache";

export default function PostList({
  posts,
  subreddit = "",
  searchRedditUrl,
  showDetail,
  isShowingDetail,
  setIsShowingDetail,
  cachedAt,
  onRefresh,
  onNewSearch,
}: {
  posts: RedditResultItem[];
  subreddit?: string;
  searchRedditUrl: string;
  showDetail: boolean;
  isShowingDetail: boolean;
  setIsShowingDetail: (value: boolean) => void;
  cachedAt?: number;
  onRefresh: () => void;
  onNewSearch?: () => void;
}) {
  if (!posts.length) {
    return null;
  }

  const baseTitle = subreddit ? `Results in ${subreddit.substring(1, subreddit.length - 1)}` : "Results";
  // Surfacing the cache age explains why results can appear instantly while rate
  // limited, and makes "Refresh" a visible remedy rather than a hidden one.
  const resultsTitle = cachedAt ? `${baseTitle} · cached ${describeCacheAge(cachedAt)}` : baseTitle;

  return (
    <>
      <List.Section title={resultsTitle}>
        {posts.map((x) => {
          const age = relativeTime(x.created);
          // A relative age ("5m ago") is what a reader actually judges a post by,
          // and it leaves the row width for the title instead of a full timestamp.
          const accessories = showDetail
            ? []
            : [
                ...(subreddit ? [] : [{ tag: `r/${x.subreddit}` }]),
                ...(age ? [{ text: age, tooltip: absoluteTime(x.created) }] : []),
              ];
          return (
            <List.Item
              key={x.id}
              icon={
                x.thumbnail && (x.thumbnail.startsWith("http:") || x.thumbnail.startsWith("https:"))
                  ? { source: x.thumbnail }
                  : Icon.Text
              }
              title={x.title}
              accessories={accessories}
              actions={
                <PostActionPanel
                  data={x}
                  isShowingDetail={isShowingDetail}
                  setIsShowingDetail={setIsShowingDetail}
                  onRefresh={onRefresh}
                  onNewSearch={onNewSearch}
                />
              }
              detail={<PostDetail data={x} />}
            />
          );
        })}
      </List.Section>
      {/*
        Reddit's Atom feed has no `after` cursor, so there is no next page to fetch —
        the result count is capped by the `limit` preference. Sending people to Reddit
        is the honest alternative to a "Show more" that cannot load more.
      */}
      <List.Section title="Didn't find what you're looking for?">
        <List.Item
          id="searchOnReddit"
          key="searchOnReddit"
          icon={Icon.Globe}
          title="Show all results on Reddit..."
          // Without a detail this row leaves the pane blank while the rest of the
          // list fills it, which reads as a rendering failure rather than a row
          // that simply has nothing to preview.
          detail={
            <List.Item.Detail
              markdown={`# Show All Results on Reddit\n\nRaycast shows a limited number of results per search.\n\nOpen this search on Reddit to browse the full result set, load more pages, and use Reddit's own filters.`}
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={searchRedditUrl} icon={Icon.Globe} />
              <ToggleDetailAction isShowingDetail={isShowingDetail} setIsShowingDetail={setIsShowingDetail} />
              <RefreshAction onRefresh={onRefresh} />
            </ActionPanel>
          }
        />
      </List.Section>
    </>
  );
}
