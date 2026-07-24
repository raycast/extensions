import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { failureToast, rateLimitToast } from "./util/toast";
import { isAbortError } from "./util/errors";
import useRateLimitCooldown from "./util/useRateLimitCooldown";
import { isRateLimited } from "./RedditApi/errors";
import { RATE_LIMIT_COOLDOWN_SECONDS } from "./RedditApi/Api";
import RedditResult from "./RedditApi/RedditResult";
import { cacheKey, readCache, postsCached } from "./util/searchCache";
import { joinWithBaseUrl } from "./RedditApi/UrlBuilder";
import { useEffect, useRef, useState } from "react";
import PostList from "./PostList";
import getPreferences from "./Preferences";
import { searchAll } from "./RedditApi/Api";
import RedditResultItem from "./RedditApi/RedditResultItem";
import redditSort from "./RedditSort";
import Sort from "./Sort";
import SortOrderDropdown from "./SortOrderDropdown";

const filterLog = logger.child("[FilterBySubredditPostList]");

export default function FilterBySubredditPostList({
  subreddit,
  subredditName,
}: {
  subreddit: string;
  subredditName: string;
}) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [results, setResults] = useState<RedditResultItem[]>([]);
  // Sticky sort, shared with the main post search (same cache key) so the chosen
  // order carries across views. Stored as the sortValue string — Sort carries a
  // non-serializable Icon.
  const [sortValue, setSortValue] = useCachedState<string>("post-sort", redditSort.relevance.sortValue);
  const sort = redditSort.getSortFromValue(sortValue) ?? redditSort.relevance;
  const [searchRedditUrl, setSearchRedditUrl] = useState("");
  const [searching, setSearching] = useState(true);
  const queryRef = useRef<string>("");
  const [searchText, setSearchText] = useState("");
  const [hideDetail, setHideDetail] = useState(false);
  // Shares the "is-showing-detail" cache key with the other lists so the pane's
  // visibility follows the user across views instead of resetting per screen.
  const [isShowingDetail, setIsShowingDetail] = useCachedState("is-showing-detail", true);
  const { secondsRemaining, startCooldown, armIfSpent, isCoolingDown, isCoolingDownNow } = useRateLimitCooldown();
  const [cachedAt, setCachedAt] = useState<number | undefined>(undefined);

  const doSearch = async (query: string, sort = redditSort.relevance, { forceRefresh = false } = {}) => {
    if (!query && !subreddit) {
      setSearching(false);
      return;
    }

    const preferences = getPreferences();

    // Opening a subreddit right after finding it is the common path, and finding
    // it just spent the minute's request — so a cached result must still render.
    // Only a call that would actually hit the network is gated on the cooldown.
    const cached = forceRefresh
      ? undefined
      : readCache<RedditResult>(cacheKey(["posts", subreddit, query, preferences.resultLimit, sort?.sortValue ?? ""]));

    // Gate on the SYNCHRONOUS cache read, not the polled `isCoolingDown` (see Home.tsx).
    if (!cached && isCoolingDownNow()) {
      setSearching(false);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSearching(true);
    queryRef.current = query;
    setResults([]);

    try {
      const apiResults = await searchAll(subreddit, query, preferences.resultLimit, sort?.sortValue ?? "", controller, {
        forceRefresh,
      });
      setSearchRedditUrl(apiResults.url);
      setResults(apiResults.items);
      setCachedAt(apiResults.cachedAt);
      // Arm the cooldown the moment Reddit's budget is spent (before the next 429).
      armIfSpent(apiResults.rateLimit);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      if (isRateLimited(error)) {
        startCooldown(error.retryAfterSeconds ?? RATE_LIMIT_COOLDOWN_SECONDS);
      }

      filterLog.error("Subreddit post search failed", error);
      await failureToast(`Couldn’t search r/${subredditName}`, error);
    } finally {
      // Only clear loading if THIS call still owns the request (see Home.tsx).
      if (abortControllerRef.current === controller) {
        setSearching(false);
      }
    }
  };

  useEffect(() => {
    doSearch("");

    return () => {
      abortControllerRef?.current?.abort();
    };
  }, []);

  const showDetail = isShowingDetail && !hideDetail && !searching;
  const subredditUrl = joinWithBaseUrl(subreddit);

  return (
    <List
      isShowingDetail={showDetail}
      isLoading={searching}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        isCoolingDown ? `Reddit rate limit — retry in ${secondsRemaining}s` : `Search r/${subredditName}, then press ↵`
      }
      searchBarAccessory={
        <SortOrderDropdown
          sort={sort}
          onSortChange={(newSort: Sort) => {
            // Don't change the sort if results are showing but the re-search can't
            // run — the label must not claim an order the visible posts aren't in.
            const blocked =
              results.length > 0 &&
              isCoolingDown &&
              !postsCached(subreddit, queryRef.current, getPreferences().resultLimit, newSort.sortValue);
            if (blocked) {
              rateLimitToast(secondsRemaining);
              return;
            }
            setSortValue(newSort.sortValue);
            doSearch(queryRef.current, newSort);
          }}
        />
      }
      onSelectionChange={(id: string | null) => setHideDetail(id === "showMore" || id === "searchOnReddit")}
      /* Owns ↵ whenever the list has no items — see Home.tsx. */
      actions={
        <ActionPanel>
          <Action title="Search Subreddit" icon={Icon.MagnifyingGlass} onAction={() => doSearch(searchText, sort)} />
          <Action.OpenInBrowser
            // eslint-disable-next-line @raycast/prefer-title-case
            title={`Open r/${subredditName} in Browser`}
            url={subredditUrl}
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    >
      {results.length === 0 && !searching && (
        <List.EmptyView
          icon={isCoolingDown ? Icon.Clock : Icon.MagnifyingGlass}
          title={
            isCoolingDown
              ? `Rate limited — retry in ${secondsRemaining}s`
              : searchText
                ? `Search r/${subredditName} for “${searchText}”`
                : `No posts loaded from r/${subredditName}`
          }
          // A bare "No Results" hid the actual cause: opening a subreddit right
          // after finding it lands inside the same one-request minute. Naming the
          // limit and offering the browser keeps the trip from dead-ending.
          description={
            isCoolingDown
              ? "Reddit allows about one search per minute. Open in your browser to keep going now."
              : "Press ↵ to search, or open the subreddit in your browser."
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                // eslint-disable-next-line @raycast/prefer-title-case
                title={`Open r/${subredditName} in Browser`}
                url={subredditUrl}
                icon={Icon.Globe}
              />
              {!isCoolingDown && (
                <Action
                  title="Search Subreddit"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => doSearch(searchText, sort)}
                />
              )}
            </ActionPanel>
          }
        />
      )}
      <PostList
        subreddit={subreddit}
        posts={results}
        searchRedditUrl={searchRedditUrl}
        showDetail={showDetail}
        isShowingDetail={isShowingDetail}
        setIsShowingDetail={setIsShowingDetail}
        cachedAt={cachedAt}
        onRefresh={() => doSearch(queryRef.current, sort, { forceRefresh: true })}
      />
    </List>
  );
}
