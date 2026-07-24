import { ActionPanel, Action, Icon, Keyboard, List } from "@raycast/api";
import { useCachedState, createExtensionDeeplink } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { failureToast } from "./util/toast";
import { isAbortError } from "./util/errors";
import useRateLimitCooldown from "./util/useRateLimitCooldown";
import useRecentSearches from "./util/useRecentSearches";
import { isRateLimited } from "./RedditApi/errors";
import { RATE_LIMIT_COOLDOWN_SECONDS, searchSubreddits } from "./RedditApi/Api";
import RedditResult from "./RedditApi/RedditResult";
import { cacheKey, readCache, describeCacheAge } from "./util/searchCache";
import { relativeTime, absoluteTime } from "./util/formatDate";
import RefreshAction from "./RefreshAction";
import { joinWithBaseUrl } from "./RedditApi/UrlBuilder";
import { normalizeSubredditSlug } from "./util/subreddit";
import { useEffect, useRef, useState } from "react";
import RedditResultSubreddit from "./RedditApi/RedditResultSubreddit";
import ToggleDetailAction from "./ToggleDetailAction";
import getPreferences from "./Preferences";

const subredditLog = logger.child("[SubredditList]");

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
  const [searchText, setSearchText] = useState("");
  const { secondsRemaining, startCooldown, armIfSpent, isCoolingDown, isCoolingDownNow } = useRateLimitCooldown();
  // Shares the "is-showing-detail" cache key with the post lists so the pane's
  // visibility follows the user across views instead of resetting per screen.
  const [isShowingDetail, setIsShowingDetail] = useCachedState("is-showing-detail", true);
  const [cachedAt, setCachedAt] = useState<number | undefined>(undefined);
  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } =
    useRecentSearches("recentSubredditSearches");

  const doSubredditSearch = async (query: string, { forceRefresh = false } = {}) => {
    if (!query) {
      return;
    }

    const preferences = getPreferences();

    // A cached result costs no request, so it stays available while rate limited.
    const cached = forceRefresh
      ? undefined
      : readCache<RedditResult>(cacheKey(["subreddits", query, preferences.resultLimit]));

    // Gate on the SYNCHRONOUS cache read, not the polled `isCoolingDown` (see Home.tsx).
    if (!cached && isCoolingDownNow()) {
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSearching(true);
    queryRef.current = query;
    setResults([]);

    try {
      subredditLog.debug("searching subreddits", { query, limit: preferences.resultLimit, forceRefresh });
      const apiResults = await searchSubreddits(query, preferences.resultLimit, controller, { forceRefresh });

      // `isFavorite` is derived at render time from the live `favorites` array, not
      // stamped here — a search that finished before favorites loaded would otherwise
      // pin every row to "not favorited" and never recompute.
      setSearchRedditUrl(apiResults.url);
      setResults(apiResults.subreddits);
      setCachedAt(apiResults.cachedAt);
      // Arm the cooldown the moment Reddit's budget is spent (before the next 429).
      armIfSpent(apiResults.rateLimit);
      await addRecentSearch(query);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      if (isRateLimited(error)) {
        startCooldown(error.retryAfterSeconds ?? RATE_LIMIT_COOLDOWN_SECONDS);
      }

      subredditLog.error("Subreddit search failed", error);
      await failureToast("Couldn’t search subreddits", error);
    } finally {
      // Only clear loading if THIS call still owns the request (see Home.tsx).
      if (abortControllerRef.current === controller) {
        setSearching(false);
      }
    }
  };

  // Favorite membership is derived from the live `favorites` array (the source of
  // truth), so it stays correct even if a search finishes before favorites load and
  // updates automatically when a favorite is toggled — no manual result patching.
  const isFavorite = (subreddit: RedditResultSubreddit) => favorites.some((f) => f === subreddit.subreddit);

  const toggleFavorite = async (subreddit: RedditResultSubreddit) => {
    if (isFavorite(subreddit)) {
      await removeFavoriteSubreddit(subreddit.subreddit);
    } else {
      await addFavoriteSubreddit(subreddit.subreddit);
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
      isShowingDetail={isShowingDetail && results.length > 0}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        isCoolingDown ? `Reddit rate limit — retry in ${secondsRemaining}s` : "Search subreddits, then press ↵"
      }
      /* Owns ↵ whenever the list has no items — see Home.tsx. */
      actions={
        <ActionPanel>
          <Action
            title="Search Subreddits"
            icon={Icon.MagnifyingGlass}
            onAction={() => doSubredditSearch(searchText)}
          />
        </ActionPanel>
      }
    >
      {!!searchText && results.length === 0 && !searching && (
        <List.EmptyView
          icon={isCoolingDown ? Icon.Clock : Icon.MagnifyingGlass}
          title={
            isCoolingDown ? `Rate limited — retry in ${secondsRemaining}s` : `Search subreddits for “${searchText}”`
          }
          description={
            isCoolingDown
              ? "Reddit allows about one search per minute. Cached searches still work."
              : "Press ↵ to search."
          }
          actions={
            isCoolingDown ? undefined : (
              <ActionPanel>
                <Action
                  title="Search Subreddits"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => doSubredditSearch(searchText)}
                />
              </ActionPanel>
            )
          }
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
                    title="Search Subreddits"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => {
                      setSearchText(search.query);
                      doSubredditSearch(search.query);
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

      {/*
        Favorites live on the default screen (below Recent Searches) so a saved
        subreddit is one keystroke away without re-searching. `favorites` are stored
        as `/r/<slug>/` paths — normalize to a slug for display and actions.
      */}
      {!searchText && results.length === 0 && favorites.length > 0 && (
        <List.Section title="Favorite Subreddits">
          {favorites.map((favorite) => {
            const slug = normalizeSubredditSlug(favorite);
            return (
              <List.Item
                key={favorite}
                icon={Icon.Star}
                title={`r/${slug}`}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      // eslint-disable-next-line @raycast/prefer-title-case
                      title={`Open r/${slug} in Browser`}
                      url={joinWithBaseUrl(favorite)}
                      icon={Icon.Globe}
                    />
                    <Action.Open
                      // eslint-disable-next-line @raycast/prefer-title-case
                      title={`Search r/${slug}…`}
                      icon={Icon.MagnifyingGlass}
                      target={createExtensionDeeplink({
                        command: "quick-search-subreddit",
                        arguments: { subreddit: slug },
                      })}
                    />
                    <Action.CopyToClipboard
                      title="Copy Subreddit Name"
                      content={`r/${slug}`}
                      shortcut={Keyboard.Shortcut.Common.CopyName}
                    />
                    <Action
                      title="Remove from Favorites"
                      icon={Icon.StarDisabled}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Pin}
                      onAction={() => removeFavoriteSubreddit(favorite)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      <List.Section title={cachedAt ? `Subreddits · cached ${describeCacheAge(cachedAt)}` : "Subreddits"}>
        {results.map((x) => (
          <List.Item
            key={x.id}
            // Reddit only publishes an icon for some subreddits, so fall back to a
            // recognisable glyph rather than an empty slot.
            icon={x.iconUrl ? { source: x.iconUrl } : Icon.TwoPeople}
            title={x.title}
            subtitle={`r/${x.subredditName}`}
            accessories={[
              ...(isFavorite(x) ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []),
              ...(x.created ? [{ text: `Created ${relativeTime(x.created)}`, tooltip: absoluteTime(x.created) }] : []),
            ]}
            detail={
              <List.Item.Detail
                markdown={`# ${x.title}\n\n**r/${x.subredditName}**${x.created ? ` · Created ${absoluteTime(x.created)}` : ""}\n\n${x.description || "_No description._"}`}
              />
            }
            actions={
              <ActionPanel>
                {/*
                  Open in Browser is primary: reaching a subreddit's posts is the step
                  right after finding it, and finding it just spent the minute's request,
                  so any in-app search would 429. "Search r/… on Reddit" opens a
                  subreddit-restricted browser search — the reliable path, replacing the
                  old push-into-Raycast that landed on a blank rate-limited view.
                */}
                <Action.OpenInBrowser
                  // "r/" is Reddit's canonical lowercase subreddit prefix — title-casing it to
                  // "R/" would misname the subreddit, so the title-case rule is waived here.
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title={`Open r/${x.subredditName} in Browser`}
                  url={x.url}
                  icon={Icon.Globe}
                />
                <Action.Open
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title={`Search r/${x.subredditName}…`}
                  icon={Icon.MagnifyingGlass}
                  // Deeplink into Quick Search Subreddit with the subreddit prefilled,
                  // landing on its argument form so the user types a fresh query —
                  // rather than reusing the stale subreddit-list query.
                  target={createExtensionDeeplink({
                    command: "quick-search-subreddit",
                    arguments: { subreddit: x.subredditName },
                  })}
                />
                <Action
                  title={isFavorite(x) ? "Remove from Favorites" : "Add to Favorites"}
                  icon={isFavorite(x) ? Icon.StarDisabled : Icon.Star}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                  onAction={() => toggleFavorite(x)}
                />
                <Action.CopyToClipboard
                  title="Copy Subreddit Name"
                  content={`r/${x.subredditName}`}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
                <Action.CopyToClipboard
                  title="Copy Subreddit URL"
                  content={x.url}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <ToggleDetailAction isShowingDetail={isShowingDetail} setIsShowingDetail={setIsShowingDetail} />
                <RefreshAction onRefresh={() => doSubredditSearch(queryRef.current, { forceRefresh: true })} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {results.length > 0 && (
        <List.Section title="Didn't find what you're looking for?">
          <List.Item
            key="searchOnReddit"
            icon={Icon.Globe}
            title="Show all results on Reddit..."
            // Without a detail this row leaves the pane blank while the rest of the
            // list fills it, which reads as a rendering failure rather than a row
            // that simply has nothing to preview.
            detail={
              <List.Item.Detail
                markdown={`# Show All Results on Reddit\n\nRaycast shows a limited number of subreddits per search.\n\nOpen this search on Reddit to browse every matching subreddit and use Reddit's own filters.`}
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={searchRedditUrl} icon={Icon.Globe} />
                <ToggleDetailAction isShowingDetail={isShowingDetail} setIsShowingDetail={setIsShowingDetail} />
                <RefreshAction onRefresh={() => doSubredditSearch(queryRef.current, { forceRefresh: true })} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
