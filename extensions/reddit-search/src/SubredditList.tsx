import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useRef, useState } from "react";
import { searchSubreddits } from "./RedditApi/Api";
import RedditResultSubreddit from "./RedditApi/RedditResultSubreddit";
import FilterBySubredditPostList from "./FilterBySubredditPostList";

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

  const doSearch = async (query: string) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setSearching(true);
    setResults([]);
    queryRef.current = query;

    if (!query) {
      setSearching(false);
      return;
    }

    try {
      const apiResults = await searchSubreddits(query, abortControllerRef.current);
      for (let i = 0; i < apiResults.subreddits.length; i++) {
        const apiResult = apiResults.subreddits[i];
        apiResult.isFavorite = favorites.some((y) => y === apiResult.subreddit);
      }

      setSearchRedditUrl(apiResults.url);
      setResults(apiResults.subreddits);
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
    <List isLoading={searching} onSearchTextChange={doSearch} throttle searchBarPlaceholder="Search Subreddits...">
      {results.map((x) => (
        <List.Item
          key={x.id}
          icon={Icon.Text}
          title={x.title}
          accessoryTitle={`Posted ${x.created} r/${x.subredditName}${x.isFavorite ? " ⭐" : ""}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Search Reddit..."
                target={<FilterBySubredditPostList subredditName={x.subredditName} subreddit={x.subreddit} />}
              />
              <Action.OpenInBrowser url={x.url} icon={Icon.Globe} />
              {!x.isFavorite && (
                <Action
                  title="Favorite"
                  icon={Icon.Star}
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
