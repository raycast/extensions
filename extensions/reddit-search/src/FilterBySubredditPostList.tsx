import { List, showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import PostList from "./PostList";
import getPreferences from "./Preferences";
import { searchAll } from "./RedditApi/Api";
import RedditResultItem from "./RedditApi/RedditResultItem";
import RedditSort from "./RedditSort";
import Sort from "./Sort";

export default function FilterBySubredditPostList({
  subreddit,
  subredditName,
}: {
  subreddit: string;
  subredditName: string;
}) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [results, setResults] = useState<RedditResultItem[]>([]);
  const [sort, setSort] = useState(RedditSort.relevance);
  const [searchRedditUrl, setSearchRedditUrl] = useState("");
  const [searching, setSearching] = useState(true);
  const queryRef = useRef<string>("");

  const doSearch = async (query: string, sort = RedditSort.relevance, after = "") => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setSearching(true);
    queryRef.current = query;
    setSort(sort);
    if (!after) {
      setResults([]);
    }

    if (!query && !subreddit) {
      setSearching(false);
      return;
    }

    try {
      const preferences = getPreferences();
      const apiResults = await searchAll(
        subreddit,
        query,
        preferences.resultLimit,
        sort?.sortValue ?? "",
        after,
        abortControllerRef.current
      );
      setSearchRedditUrl(apiResults.url);

      if (after) {
        setResults([...results, ...apiResults.items]);
      } else {
        setResults(apiResults.items);
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
    doSearch("");

    return () => {
      abortControllerRef?.current?.abort();
    };
  }, []);

  return (
    <List
      isLoading={searching}
      onSearchTextChange={(query) => {
        setSearching(true);
        doSearch(query);
      }}
      throttle
      searchBarPlaceholder={`Search r/${subredditName}...`}
    >
      <PostList
        subreddit={subreddit}
        posts={results}
        sort={sort}
        doSearch={(sort: Sort, after?: string) => doSearch(queryRef.current, sort, after)}
        searchRedditUrl={searchRedditUrl}
      />
    </List>
  );
}
