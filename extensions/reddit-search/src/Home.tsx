import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useRef, useState } from "react";
import { searchAll } from "./RedditApi/Api";
import RedditResultItem from "./RedditApi/RedditResultItem";
import { joinWithBaseUrl } from "./RedditApi/UrlBuilder";
import SubredditList from "./SubredditList";
import FilterBySubredditPostList from "./FilterBySubredditPostList";
import Sort from "./Sort";

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
  const [results, setResults] = useState<RedditResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchRedditUrl, setSearchRedditUrl] = useState("");
  const [showSearchTypes, setShowSearchTypes] = useState(true);
  const [sort, setSort] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryRef = useRef<string>("");

  const doSearch = async (query: string, sort?: Sort) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setSearching(true);
    setResults([]);
    setSort(sort?.name ?? "");
    queryRef.current = query;

    if (!query) {
      setSearching(false);
      setShowSearchTypes(true);
      return;
    }

    setShowSearchTypes(false);

    try {
      const apiResults = await searchAll("", query, sort?.sortValue ?? "", abortControllerRef.current);
      setSearchRedditUrl(apiResults.url);
      setResults(apiResults.items);
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }

      console.log(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong :(",
        message: String(error),
      });
    } finally {
      setSearching(false);
    }
  };

  return (
    <List isLoading={searching} onSearchTextChange={doSearch} throttle searchBarPlaceholder="Search Reddit...">
      {showSearchTypes && (
        <>
          <List.Section title="More ways to search">
            <List.Item
              key="searchOnRedditForSubreddits"
              icon={Icon.MagnifyingGlass}
              title="Search subreddits..."
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
                title={x}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Search subreddit"
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
      <PostList
        posts={results}
        sort={sort}
        searchRedditUrl={searchRedditUrl}
        doSearch={(sort: Sort) => doSearch(queryRef.current, sort)}
      />
    </List>
  );
}
