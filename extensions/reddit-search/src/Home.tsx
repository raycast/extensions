import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { joinWithBaseUrl } from "./RedditApi/UrlBuilder";
import SubredditList from "./SubredditList";
import FilterBySubredditPostList from "./FilterBySubredditPostList";
import PostList from "./PostList";
import RedditResultItem from "./RedditApi/RedditResultItem";
import RedditSort from "./RedditSort";
import { AbortError } from "node-fetch";
import getPreferences from "./Preferences";
import { searchAll } from "./RedditApi/Api";
import Sort from "./Sort";
import SortOrderDropdown from "./SortOrderDropdown";
import useShowDetailSetting from "./ShowDetailSetting";

export default function Home({
  favorites,
  addFavoriteSubreddit,
  removeFavoriteSubreddit,
}: {
  favorites: string[];
  addFavoriteSubreddit: (subreddit: string) => void;
  removeFavoriteSubreddit: (subreddit: string) => void;
}) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [results, setResults] = useState<RedditResultItem[]>([]);
  const [sort, setSort] = useState(RedditSort.relevance);
  const [searchRedditUrl, setSearchRedditUrl] = useState("");
  const [searching, setSearching] = useState(false);
  const queryRef = useRef<string>("");
  const [hideDetail, setHideDetail] = useState(false);
  const [showDetailSetting, toggleDetailSetting] = useShowDetailSetting();

  const doSearch = async (query: string, sort = RedditSort.relevance, after = "") => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setSearching(true);
    queryRef.current = query;
    setSort(sort);
    if (!after) {
      setResults([]);
    }

    if (!query) {
      setSearching(false);
      return;
    }

    try {
      const preferences = getPreferences();
      const apiResults = await searchAll(
        "",
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
    // const test = async () => {
    //   const setting = await showDetailSettingStore.getShowDetailSetting();
    //   setShowDetailSetting(setting);
    // };

    // test();

    return () => {
      abortControllerRef?.current?.abort();
    };
  }, []);

  const showDetail = showDetailSetting && !!queryRef.current && !hideDetail && !searching;

  return (
    <List
      isShowingDetail={showDetail}
      isLoading={searching}
      onSearchTextChange={(text) => doSearch(text, sort)}
      throttle
      searchBarPlaceholder="Search Reddit..."
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
      {!queryRef.current && (
        <>
          <List.Section title="More ways to search">
            <List.Item
              key="searchOnRedditForSubreddits"
              icon={Icon.MagnifyingGlass}
              title="Search Subreddits..."
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Search Subreddits"
                    target={
                      <SubredditList
                        favorites={favorites}
                        addFavoriteSubreddit={addFavoriteSubreddit}
                        removeFavoriteSubreddit={removeFavoriteSubreddit}
                        showDetail={showDetailSetting}
                        toggleShowDetail={toggleDetailSetting}
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
                      target={
                        <FilterBySubredditPostList
                          subreddit={x}
                          subredditName={x.substring(3, x.length - 1)}
                          showDetailSetting={showDetailSetting}
                          toggleShowDetailSetting={toggleDetailSetting}
                        />
                      }
                    />
                    <Action.OpenInBrowser url={joinWithBaseUrl(x)} icon={Icon.Globe} />
                    <Action
                      title="Remove from Favorites"
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
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
        subreddit=""
        posts={results}
        sort={sort}
        doSearch={(sort: Sort, after?: string) => doSearch(queryRef.current, sort, after)}
        searchRedditUrl={searchRedditUrl}
        showDetail={showDetailSetting}
        toggleShowDetail={toggleDetailSetting}
      />
    </List>
  );
}
