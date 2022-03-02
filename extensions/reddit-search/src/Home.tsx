import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useState } from "react";
import { joinWithBaseUrl } from "./RedditApi/UrlBuilder";
import SubredditList from "./SubredditList";
import FilterBySubredditPostList from "./FilterBySubredditPostList";
import PostList from "./PostList";

export default function Home({
  favorites,
  addFavoriteSubreddit,
  removeFavoriteSubreddit,
}: {
  favorites: string[];
  addFavoriteSubreddit: (subreddit: string) => void;
  removeFavoriteSubreddit: (subreddit: string) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState<string>("");

  return (
    <List isLoading={searching} onSearchTextChange={setQuery} throttle searchBarPlaceholder="Search Reddit...">
      {!query && (
        <>
          <List.Section title="More ways to search">
            <List.Item
              key="searchOnRedditForSubreddits"
              icon={Icon.MagnifyingGlass}
              title="Search Subreddits..."
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Search subreddits"
                    target={
                      <SubredditList
                        favorites={favorites}
                        addFavoriteSubreddit={addFavoriteSubreddit}
                        removeFavoriteSubreddit={removeFavoriteSubreddit}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Favorite subreddits">
            {favorites.map((x) => (
              <List.Item
                key={x}
                title={x.substring(1, x.length - 1)}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={`Search in ${x.substring(1, x.length - 1)}`}
                      target={<FilterBySubredditPostList subreddit={x} subredditName={x.substring(3, x.length - 1)} />}
                    />
                    <Action.OpenInBrowser url={joinWithBaseUrl(x)} icon={Icon.Globe} />
                    <Action
                      title="Remove from Favorites"
                      icon={Icon.Trash}
                      onAction={async () => {
                        await removeFavoriteSubreddit(x);
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
      <PostList setSearching={setSearching} query={query} />
    </List>
  );
}
