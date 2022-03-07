import { ActionPanel, Action, Icon, List } from "@raycast/api";
import RedditResultItem from "./RedditApi/RedditResultItem";
import PostActionPanel from "./PostActionPanel";
import redditSort from "./RedditSort";
import SortListItem from "./SortListItem";
import Sort from "./Sort";

export default function PostList({
  posts,
  subreddit = "",
  sort,
  doSearch,
  searchRedditUrl,
}: {
  posts: RedditResultItem[];
  subreddit?: string;
  sort: Sort;
  doSearch: (sort: Sort, after?: string) => void;
  searchRedditUrl: string;
}) {
  if (!posts.length) {
    return null;
  }

  const resultsTitle = subreddit ? `Results in ${subreddit.substring(1, subreddit.length - 1)}` : "Results";

  return (
    <>
      <List.Section title={sort ? `${resultsTitle} (Sorted by ${sort.name})` : resultsTitle}>
        {posts.map((x) => (
          <List.Item
            key={x.id}
            icon={
              x.thumbnail && (x.thumbnail.startsWith("http:") || x.thumbnail.startsWith("https:"))
                ? { source: x.thumbnail }
                : Icon.Text
            }
            title={x.title}
            accessoryTitle={subreddit ? `Posted ${x.created}` : `Posted ${x.created} r/${x.subreddit}`}
            actions={<PostActionPanel data={x} />}
          />
        ))}
        <List.Item
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
      <List.Section title="Sort">
        <SortListItem sort={redditSort.relevance} currentSort={sort} doSearch={doSearch} />
        <SortListItem sort={redditSort.hot} currentSort={sort} doSearch={doSearch} />
        <SortListItem sort={redditSort.top} currentSort={sort} doSearch={doSearch} />
        <SortListItem sort={redditSort.latest} currentSort={sort} doSearch={doSearch} />
        <SortListItem sort={redditSort.comments} currentSort={sort} doSearch={doSearch} />
      </List.Section>
      <List.Section title="Didn't find what you're looking for?">
        <List.Item
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
