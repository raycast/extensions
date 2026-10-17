import { ActionPanel, Action, Icon, Keyboard, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { failureToast, rateLimitToast } from "./util/toast";
import useRateLimitCooldown from "./util/useRateLimitCooldown";
import useRecentSearches from "./util/useRecentSearches";
import { isRateLimited } from "./RedditApi/errors";
import { RATE_LIMIT_COOLDOWN_SECONDS } from "./RedditApi/Api";
import RedditResult from "./RedditApi/RedditResult";
import { cacheKey, readCache, postsCached } from "./util/searchCache";
import NewSearchAction from "./NewSearchAction";
import { useEffect, useRef, useState } from "react";
import { joinWithBaseUrl } from "./RedditApi/UrlBuilder";
import FilterBySubredditPostList from "./FilterBySubredditPostList";
import PostList from "./PostList";
import RedditResultItem from "./RedditApi/RedditResultItem";
import RedditSort from "./RedditSort";
import { isAbortError } from "./util/errors";
import getPreferences from "./Preferences";
import { searchAll } from "./RedditApi/Api";
import Sort from "./Sort";
import SortOrderDropdown from "./SortOrderDropdown";

const homeLog = logger.child("[Home]");

export default function Home({
  favorites,
  removeFavoriteSubreddit,
}: {
  favorites: string[];
  removeFavoriteSubreddit: (subreddit: string) => void;
}) {
  const abortControllerRef = useRef<AbortController | null>(null);
  // The reservation token of the in-flight request, released synchronously when a new
  // search supersedes it (an async catch would run too late — the replacement would
  // already have been refused by the slot the aborted request still held).
  const reservationRef = useRef<string | null>(null);
  const [results, setResults] = useState<RedditResultItem[]>([]);
  // The sort is its own persisted state, NOT derived from the last search. It must
  // be settable before any query (so results come back in the wanted order) and
  // sticky across command reloads — the sortValue string is cached (Sort carries a
  // non-serializable Icon, so store the value and resolve it back to a Sort).
  const [sortValue, setSortValue] = useCachedState<string>("post-sort", RedditSort.relevance.sortValue);
  const sort = RedditSort.getSortFromValue(sortValue) ?? RedditSort.relevance;
  const [searchRedditUrl, setSearchRedditUrl] = useState("");
  const [searching, setSearching] = useState(false);
  const queryRef = useRef<string>("");
  const [searchText, setSearchText] = useState("");
  // Two modes over one search bar: in ENTRY mode the bar text is the Reddit query
  // and ↵ fetches; once results load we switch to FILTER mode, where Raycast filters
  // the loaded list locally (instant, no request). "New Search" returns to entry.
  const [filtering, setFiltering] = useState(false);
  const [hideDetail, setHideDetail] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | undefined>(undefined);
  const [isShowingDetail, setIsShowingDetail] = useCachedState("is-showing-detail", true);
  const { secondsRemaining, startCooldown, settleAfterRequest, releaseReservation, reserveRequestSlot, isCoolingDown } =
    useRateLimitCooldown();
  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } =
    useRecentSearches("recentPostSearches");

  const doSearch = async (query: string, sort = RedditSort.relevance, { forceRefresh = false } = {}) => {
    if (!query) {
      return;
    }

    const preferences = getPreferences();

    // A cached result costs no request, so it must stay available while rate
    // limited — that is the whole point of caching against a 1/minute budget.
    // Only a call that would actually hit the network is gated on the cooldown.
    const cached = forceRefresh
      ? undefined
      : readCache<RedditResult>(cacheKey(["posts", "", query, preferences.resultLimit, sort?.sortValue ?? ""]));

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // RESERVE the shared request slot before sending (not just check it): two commands
    // can't both read "clear" and both send. A same-command supersede REUSES the hold
    // we already own (reservationRef) rather than releasing and re-claiming — the
    // aborted request and its replacement are one command sharing one slot. Cached
    // reads skip this: they cost no request.
    let reservation = reservationRef.current;
    if (!cached && !reservation) {
      reservation = reserveRequestSlot();
      if (!reservation) {
        setSearching(false);
        return;
      }
      reservationRef.current = reservation;
    }

    setSearching(true);
    queryRef.current = query;
    setResults([]);

    try {
      homeLog.debug("searching posts", {
        query,
        sort: sort?.sortValue,
        limit: preferences.resultLimit,
        forceRefresh,
      });
      const apiResults = await searchAll("", query, preferences.resultLimit, sort?.sortValue ?? "", controller, {
        forceRefresh,
      });
      setSearchRedditUrl(apiResults.url);
      setResults(apiResults.items);
      setCachedAt(apiResults.cachedAt);
      // Results are in — hand the search bar to local filtering and clear it so
      // filtering starts from the full set.
      if (apiResults.items.length > 0) {
        setFiltering(true);
        setSearchText("");
      }
      // Settle the reservation: hold if the budget is spent, release if it remained.
      if (reservation) settleAfterRequest(reservation, apiResults.rateLimit);
      reservationRef.current = null;
      await addRecentSearch(query);
    } catch (error) {
      if (isAbortError(error)) {
        // Superseded — leave the reservation in place; the replacement reuses it via
        // reservationRef, so releasing here would strand the live request.
        return;
      }

      if (isRateLimited(error)) {
        startCooldown(error.retryAfterSeconds ?? RATE_LIMIT_COOLDOWN_SECONDS);
      } else if (reservation) {
        // Failed before Reddit spent the budget (network error) — release the
        // provisional hold so a transient blip doesn't lock the user out for 60s.
        releaseReservation(reservation);
      }
      reservationRef.current = null;

      homeLog.error("Reddit search failed", error);
      await failureToast("Couldn’t search Reddit", error);
    } finally {
      // Only clear loading if THIS call still owns the request. A superseded search
      // must not turn off the spinner for the replacement that aborted it.
      if (abortControllerRef.current === controller) {
        setSearching(false);
      }
    }
  };

  // Return to query-entry: leave filter mode and restore the last query into the
  // bar so it can be edited into the next search.
  const startNewSearch = () => {
    setFiltering(false);
    setResults([]);
    setSearchText(queryRef.current);
  };

  useEffect(() => {
    return () => {
      abortControllerRef?.current?.abort();
    };
  }, []);

  const showDetail = isShowingDetail && !!queryRef.current && !hideDetail && !searching;

  // In FILTER mode `searchText` is a local filter, not a query — only ENTRY mode
  // computes a fetchable query. A cached query costs no request, so it stays
  // searchable while rate limited; only a query that would hit the network is
  // blocked, and then the primary action shows the countdown and no-ops rather than
  // firing a doomed request — the honest "you have to wait", and the case for auth.
  const preferences = getPreferences();
  const entryQuery = filtering ? "" : searchText;
  const wouldHitNetwork = !!entryQuery && !postsCached("", entryQuery, preferences.resultLimit, sort?.sortValue ?? "");
  const searchBlocked = isCoolingDown && wouldHitNetwork;
  const searchActionTitle = searchBlocked ? `Search Reddit (in ${secondsRemaining}s)` : "Search Reddit";

  const searchAction = (
    <Action
      title={searchActionTitle}
      icon={searchBlocked ? Icon.Clock : Icon.MagnifyingGlass}
      onAction={() => {
        if (!searchBlocked) {
          doSearch(entryQuery, sort);
        }
      }}
    />
  );

  const newSearchAction = <NewSearchAction onNewSearch={startNewSearch} />;

  return (
    <List
      isShowingDetail={showDetail}
      isLoading={searching}
      // ENTRY mode: we own the text (it's the query) and Raycast must not filter.
      // FILTER mode: Raycast filters the loaded results against the bar text.
      filtering={filtering}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        filtering
          ? "Filter results…"
          : isCoolingDown
            ? `Reddit rate limit — retry in ${secondsRemaining}s`
            : "Search Reddit, then press ↵"
      }
      searchBarAccessory={
        <SortOrderDropdown
          sort={sort}
          onSortChange={(newSort: Sort) => {
            // If results are already showing but the re-search under the new sort
            // can't run (rate limited, no cache for it), DON'T change the sort — a
            // persisted label with no matching results would claim an order the
            // visible posts aren't in. Just leave the current sort/results intact.
            const blocked =
              results.length > 0 &&
              isCoolingDown &&
              !postsCached("", queryRef.current, preferences.resultLimit, newSort.sortValue);
            if (blocked) {
              // A rejected dropdown change looks broken — say why, with the countdown.
              rateLimitToast(secondsRemaining);
              return;
            }

            // Persist the choice (works before any search and survives reloads).
            // Re-run only if a search is already on screen; otherwise just arm it.
            setSortValue(newSort.sortValue);
            if (queryRef.current) {
              doSearch(queryRef.current, newSort);
            }
          }}
        />
      }
      onSelectionChange={(id: string | null) => setHideDetail(id === "showMore" || id === "searchOnReddit")}
      /*
        Reddit's feed allows only about one request per minute, so searching runs
        on an explicit ↵ rather than on every keystroke. These root-level actions
        own ↵ whenever the list has no items — a "Search Reddit for X" row would
        just restate the search bar. When rate limited, ↵ carries the countdown and
        no-ops instead of firing a doomed request; the user can still edit the query.
      */
      actions={<ActionPanel>{filtering ? newSearchAction : searchAction}</ActionPanel>}
    >
      {!filtering && !!searchText && results.length === 0 && !searching && (
        <List.EmptyView
          icon={searchBlocked ? Icon.Clock : Icon.MagnifyingGlass}
          title={searchBlocked ? `Rate limited — retry in ${secondsRemaining}s` : `Search Reddit for “${searchText}”`}
          description={
            searchBlocked
              ? "Reddit allows about one search per minute. Press ↵ when the timer ends, or edit your query."
              : "Press ↵ to search."
          }
          actions={<ActionPanel>{searchAction}</ActionPanel>}
        />
      )}
      {!searchText && results.length === 0 && recentSearches.length > 0 && (
        <List.Section title="Recent Searches">
          {recentSearches.map((search) => (
            <List.Item
              key={search.query}
              icon={Icon.Clock}
              title={search.query}
              subtitle={new Date(search.timestamp).toLocaleDateString()}
              actions={
                <ActionPanel>
                  <Action
                    title="Search Reddit"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => {
                      setSearchText(search.query);
                      doSearch(search.query, sort);
                    }}
                  />
                  <Action
                    title="Remove from Recent Searches"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => removeRecentSearch(search.query)}
                  />
                  <Action
                    title="Clear Recent Searches"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={clearRecentSearches}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {!queryRef.current && (
        <>
          <List.Section title="Favorite subreddits">
            {favorites.map((x) => (
              <List.Item
                key={x}
                title={x.substring(1, x.length - 1)}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={`Search in ${x.substring(1, x.length - 1)}`}
                      icon={Icon.MagnifyingGlass}
                      target={<FilterBySubredditPostList subreddit={x} subredditName={x.substring(3, x.length - 1)} />}
                    />
                    <Action.OpenInBrowser url={joinWithBaseUrl(x)} icon={Icon.Globe} />
                    <Action
                      title="Remove from Favorites"
                      icon={Icon.Trash}
                      shortcut={Keyboard.Shortcut.Common.Pin}
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
        searchRedditUrl={searchRedditUrl}
        showDetail={showDetail}
        isShowingDetail={isShowingDetail}
        setIsShowingDetail={setIsShowingDetail}
        cachedAt={cachedAt}
        onRefresh={() => doSearch(queryRef.current, sort, { forceRefresh: true })}
        onNewSearch={startNewSearch}
      />
    </List>
  );
}
