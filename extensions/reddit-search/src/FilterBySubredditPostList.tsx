import { List, showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import PostList from "./PostList";
import getPreferences from "./Preferences";
import { searchAll } from "./RedditApi/Api";
import RedditResultItem from "./RedditApi/RedditResultItem";
import redditSort from "./RedditSort";
import Sort from "./Sort";
import SortOrderDropdown from "./SortOrderDropdown";

export default function FilterBySubredditPostList({
  subreddit,
  subredditName,
  showDetailSetting,
  toggleShowDetailSetting,
}: {
  subreddit: string;
  subredditName: string;
  showDetailSetting: boolean;
  toggleShowDetailSetting: () => void;
}) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [results, setResults] = useState<RedditResultItem[]>([]);
  const [sort, setSort] = useState(redditSort.relevance);
  const [searchRedditUrl, setSearchRedditUrl] = useState("");
  const [searching, setSearching] = useState(true);
  const queryRef = useRef<string>("");
  const [hideDetail, setHideDetail] = useState(false);
  const [ownShowDetailSetting, setOwnShowDetailSetting] = useState(showDetailSetting);

  const doSearch = async (query: string, sort = redditSort.relevance, after = "") => {
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

  const showDetail = ownShowDetailSetting && !hideDetail && !searching;

  return (
    <List
      isShowingDetail={showDetail}
      isLoading={searching}
      onSearchTextChange={(query) => doSearch(query, sort)}
      throttle
      searchBarPlaceholder={`Search r/${subredditName}...`}
      searchBarAccessory={
        <SortOrderDropdown
          defaultSort={sort}
          onSortChange={(newSort: Sort) => {
            if (sort != newSort) {
              doSearch(queryRef.current, newSort);
            }
          }}
        />
      }
      onSelectionChange={(id?: string) => setHideDetail(id === "showMore" || id === "searchOnReddit")}
    >
      <PostList
        subreddit={subreddit}
        posts={results}
        sort={sort}
        doSearch={(sort: Sort, after?: string) => doSearch(queryRef.current, sort, after)}
        searchRedditUrl={searchRedditUrl}
        showDetail={ownShowDetailSetting}
        toggleShowDetail={() => {
          toggleShowDetailSetting();
          setOwnShowDetailSetting(!ownShowDetailSetting);
        }}
      />
    </List>
  );
}
