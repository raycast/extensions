import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import RedditResultItem from "./RedditApi/RedditResultItem";
import PostActionPanel from "./PostActionPanel";
import redditSort from "./RedditSort";
import SortListItem from "./SortListItem";
import RedditSort from "./RedditSort";
import { useEffect, useRef, useState } from "react";
import getPreferences from "./Preferences";
import { searchAll } from "./RedditApi/Api";
import { AbortError } from "node-fetch";

export default function PostList({
  setSearching,
  subreddit = "",
  query,
}: {
  setSearching: (searching: boolean) => void;
  subreddit?: string;
  query: string;
}) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [results, setResults] = useState<RedditResultItem[]>([]);
  const [sort, setSort] = useState(RedditSort.relevance);
  const [searchRedditUrl, setSearchRedditUrl] = useState("");

  const doSearch = async (sort = RedditSort.relevance, after = "") => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setSearching(true);
    if (!after) {
      setResults([]);
    }

    setSort(sort);

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
    doSearch();

    return () => {
      abortControllerRef?.current?.abort();
    };
  }, [query]);

  if (!results.length) {
    return null;
  }

  const resultsTitle = subreddit ? `Results in ${subreddit.substring(1, subreddit.length - 1)}` : "Results";

  return (
    <>
      <List.Section title={sort ? `${resultsTitle} (Sorted by ${sort.name})` : resultsTitle}>
        {results.map((x) => (
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
        <List.Item
          key="showMore"
          icon={Icon.MagnifyingGlass}
          title="Show more..."
          actions={
            <ActionPanel>
              <Action title="Show more..." onAction={() => doSearch(sort, results[results.length - 1].afterId)} />
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
