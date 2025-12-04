import { ActionPanel, Action, Icon, List } from "@raycast/api";
import RedditResultItem from "./RedditApi/RedditResultItem";
import PostActionPanel from "./PostActionPanel";
import Sort from "./Sort";
import PostDetail from "./PostDetail";

export default function PostList({
  posts,
  subreddit = "",
  sort,
  doSearch,
  searchRedditUrl,
  showDetail,
  toggleShowDetail,
}: {
  posts: RedditResultItem[];
  subreddit?: string;
  sort: Sort;
  doSearch: (sort: Sort, after?: string) => void;
  searchRedditUrl: string;
  showDetail: boolean;
  toggleShowDetail: () => void;
}) {
  if (!posts.length) {
    return null;
  }

  const resultsTitle = subreddit ? `Results in ${subreddit.substring(1, subreddit.length - 1)}` : "Results";

  return (
    <>
      <List.Section title={resultsTitle}>
        {posts.map((x) => {
          let accessoryTitle = "";
          if (!showDetail) {
            accessoryTitle = subreddit ? `Posted ${x.created}` : `Posted ${x.created} r/${x.subreddit}`;
          }
          return (
            <List.Item
              key={x.id}
              icon={
                x.thumbnail && (x.thumbnail.startsWith("http:") || x.thumbnail.startsWith("https:"))
                  ? { source: x.thumbnail }
                  : Icon.Text
              }
              title={x.title}
              accessoryTitle={accessoryTitle}
              actions={<PostActionPanel data={x} showDetail={showDetail} toggleDetail={toggleShowDetail} />}
              detail={<PostDetail data={x} />}
            />
          );
        })}
        <List.Item
          id="showMore"
          key="showMore"
          icon={Icon.MagnifyingGlass}
          title="Show more..."
          actions={
            <ActionPanel>
              <Action title="Show more..." onAction={() => doSearch(sort, posts[posts.length - 1].afterId)} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Didn't find what you're looking for?">
        <List.Item
          id="searchOnReddit"
          key="searchOnReddit"
          icon={Icon.Globe}
          title="Show all results on Reddit..."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={searchRedditUrl} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      </List.Section>
    </>
  );
}
