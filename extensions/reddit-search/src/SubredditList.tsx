import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { searchSubreddits } from "./RedditApi/Api";
import RedditResultSubreddit from "./RedditApi/RedditResultSubreddit";
import FilterBySubredditPostList from "./FilterBySubredditPostList";
import getPreferences from "./Preferences";

export default function SubredditPostList({
  favorites,
  addFavoriteSubreddit,
  removeFavoriteSubreddit,
}: {
  favorites: string[];
  addFavoriteSubreddit: (subreddit: string) => void;
  removeFavoriteSubreddit: (subreddit: string) => void;
}) {
  const [results, setResults] = useState<RedditResultSubreddit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchRedditUrl, setSearchRedditUrl] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryRef = useRef<string>("");

  const doSubredditSearch = async (query: string, after = "") => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setSearching(true);
    queryRef.current = query;
    if (!after) {
      setResults([]);
    }

    if (!query) {
      setSearching(false);
      return;
    }

    try {
      const preferences = getPreferences();
      const apiResults = await searchSubreddits(query, preferences.resultLimit, after, abortControllerRef.current);
      for (let i = 0; i < apiResults.subreddits.length; i++) {
        const apiResult = apiResults.subreddits[i];
        apiResult.isFavorite = favorites.some((y) => y === apiResult.subreddit);
      }

      setSearchRedditUrl(apiResults.url);
      if (after) {
        setResults([...results, ...apiResults.subreddits]);
      } else {
        setResults(apiResults.subreddits);
      }
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

  useEffect(() => {
    return () => {
      abortControllerRef?.current?.abort();
    };
  }, []);

  return (
    <List
      isLoading={searching}
      onSearchTextChange={doSubredditSearch}
      throttle
      searchBarPlaceholder="Search Subreddits..."
    >
      <List.Section title="Subreddits">
        {results.map((x) => (
          <List.Item
            key={x.id}
            icon={Icon.Text}
            title={x.title}
            accessoryTitle={`Posted ${x.created} r/${x.subredditName}${x.isFavorite ? " ⭐" : ""}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Search in r/${x.subredditName}`}
                  target={<FilterBySubredditPostList subredditName={x.subredditName} subreddit={x.subreddit} />}
                />
                <Action.OpenInBrowser url={x.url} icon={Icon.Globe} />
                {!x.isFavorite && (
                  <Action
                    title="Add to Favorites"
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={async () => {
                      await addFavoriteSubreddit(x.subreddit);
                      const index = results.findIndex((y) => y.id === x.id);
                      setResults([
                        ...results.slice(0, index),
                        { ...results[index], isFavorite: !results[index].isFavorite },
                        ...results.slice(index + 1),
                      ]);
                    }}
                  />
                )}
                {x.isFavorite && (
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={async () => {
                      await removeFavoriteSubreddit(x.subreddit);
                      const index = results.findIndex((y) => y.id === x.id);
                      setResults([
                        ...results.slice(0, index),
                        { ...results[index], isFavorite: !results[index].isFavorite },
                        ...results.slice(index + 1),
                      ]);
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
        {results.length > 0 && (
          <List.Item
            key="showMore"
            icon={Icon.MagnifyingGlass}
            title="Show more..."
            actions={
              <ActionPanel>
                <Action
                  title="Show more..."
                  onAction={() => doSubredditSearch(queryRef.current, results[results.length - 1].afterId)}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      {results.length > 0 && (
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
      )}
    </List>
  );
}
