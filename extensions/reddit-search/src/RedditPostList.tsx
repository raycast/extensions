import { ActionPanel, Action, Icon, List } from "@raycast/api";
import RedditPost from "./RedditPost";
import RedditPostActionPanel from "./RedditPostActionPanel";

export default function RedditPostList({
  posts,
  searching,
  doSearch,
  searchRedditUrl,
}: {
  posts: RedditPost[];
  searching: boolean;
  doSearch: (query: string) => void;
  searchRedditUrl: string;
}) {
  return (
    <List isLoading={searching} onSearchTextChange={doSearch} throttle searchBarPlaceholder="Search Reddit...">
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
          actions={<RedditPostActionPanel data={x} />}
        />
      ))}
      {posts.length > 0 && (
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
      )}
    </List>
  );
}
