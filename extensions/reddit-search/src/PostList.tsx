import { ActionPanel, Action, Icon, List } from "@raycast/api";
import RedditResultItem from "./RedditApi/RedditResultItem";
import PostActionPanel from "./PostActionPanel";
import Sort from "./Sort";
import redditSort from "./RedditSort";

export default function PostList({
  posts,
  sort,
  searchRedditUrl,
  doSearch,
}: {
  posts: RedditResultItem[];
  sort: string;
  searchRedditUrl: string;
  doSearch: (sort: Sort) => void;
}) {
  if (!posts.length) {
    return null;
  }

  return (
    <>
      <List.Section title={sort ? `Results (sorted by ${sort})` : "Results"}>
        {posts.map((x) => (
          <List.Item
            key={x.id}
            icon={
              x.thumbnail && (x.thumbnail.startsWith("http:") || x.thumbnail.startsWith("https:"))
                ? { source: x.thumbnail }
                : Icon.Text
            }
            title={x.title}
            accessoryTitle={`Posted ${x.created} r/${x.subreddit}`}
            actions={<PostActionPanel data={x} />}
          />
        ))}
      </List.Section>
      <List.Section title="Didn't find what you're looking for?">
        <List.Item
          key="searchOnReddit"
          icon={Icon.MagnifyingGlass}
          title="Show all results on Reddit..."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={searchRedditUrl} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
        <List.Item
          key="sortByRelevance"
          icon={Icon.MagnifyingGlass}
          title="Sort by relevance"
          actions={
            <ActionPanel>
              <Action title="Sort by relevance" onAction={() => doSearch(redditSort.relevance)} />
            </ActionPanel>
          }
        />
        <List.Item
          key="sortByHot"
          icon={Icon.MagnifyingGlass}
          title="Sort by hot"
          actions={
            <ActionPanel>
              <Action title="Sort by hot" onAction={() => doSearch(redditSort.hot)} />
            </ActionPanel>
          }
        />
        <List.Item
          key="sortByTop"
          icon={Icon.MagnifyingGlass}
          title="Sort by top"
          actions={
            <ActionPanel>
              <Action title="Sort by top" onAction={() => doSearch(redditSort.top)} />
            </ActionPanel>
          }
        />
        <List.Item
          key="sortByLatest"
          icon={Icon.MagnifyingGlass}
          title="Sort by latest"
          actions={
            <ActionPanel>
              <Action title="Sort by latest" onAction={() => doSearch(redditSort.latest)} />
            </ActionPanel>
          }
        />
        <List.Item
          key="sortByComments"
          icon={Icon.MagnifyingGlass}
          title="Sort by comments"
          actions={
            <ActionPanel>
              <Action title="Sort by comments" onAction={() => doSearch(redditSort.comments)} />
            </ActionPanel>
          }
        />
      </List.Section>
    </>
  );
}
