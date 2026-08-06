import {
  List,
  Icon,
  ActionPanel,
  Action,
  LaunchProps,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";
import { showError } from "@chrismessina/raycast-kit";
import { useState, useMemo, useEffect, useRef } from "react";
import { Feed, FeedItem, GitHubPR, StoreItem, FilterValue } from "./types";
import {
  asArray,
  convertPRsToStoreItems,
  FEED_URL,
  fetchExtensionPackageInfo,
  fetchMergedPRs,
  getInstalledExtensionSlugs,
  GITHUB_PRS_URL,
  mapWithConcurrency,
  parseExtensionUrl,
  platformSupport,
} from "./utils";
import { ExtensionListItem } from "./components/ExtensionListItem";
import { ChangelogDetail } from "./components/ChangelogDetail";
import { useReadState } from "./hooks/useReadState";
import { useFilterToggles } from "./hooks/useFilterToggles";
import { useGitHubRateLimit } from "./hooks/useGitHubRateLimit";

// =============================================================================
// Command
// =============================================================================

/** Context the menu bar passes when ⌥-opening an item, to deep-link into its changelog. */
export interface ViewStoreUpdatesContext {
  changelogSlug?: string;
  changelogTitle?: string;
}

export default function Command(props: LaunchProps<{ launchContext?: ViewStoreUpdatesContext }>) {
  const { trackReadStatus } = getPreferenceValues<Preferences>();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const { toggles, loaded: togglesLoaded, toggleMacOS, toggleWindows } = useFilterToggles();

  const {
    data: feedData,
    isLoading: feedLoading,
    revalidate: revalidateFeed,
  } = useFetch<Feed>(FEED_URL, {
    keepPreviousData: true,
  });

  const { checkRefreshAllowed, recordFetch, recordRateLimit } = useGitHubRateLimit();

  // useCachedPromise, NOT useFetch: useFetch issues the HTTP request itself and only
  // then hands the response to parseResponse, so the GraphQL branch used to run AFTER a
  // REST call had already been spent — paying for both. fetchMergedPRs picks exactly one
  // transport, so this hook must own the request rather than post-process someone else's.
  const {
    data: prsData,
    isLoading: prsLoading,
    revalidate: revalidatePRs,
  } = useCachedPromise(fetchMergedPRs, [], {
    keepPreviousData: true,
    initialData: [] as GitHubPR[],
    async onData() {
      // A successful fetch clears any stale rate-limit cooldown; without this the
      // 5-minute block outlives the condition that set it.
      await recordFetch({});
    },
    async onError(error) {
      const reset = (error as Error & { rateLimitReset?: number }).rateLimitReset;
      if (reset !== undefined || /rate limit/i.test(error.message)) {
        const message = await recordRateLimit(reset);
        await showError(new Error(`${error.message} ${message}`), {
          title: "Rate Limited by GitHub",
          copyContext: `GET ${GITHUB_PRS_URL}`,
        });
        return;
      }
      await showError(error, { title: "Couldn't Load Store Updates", copyContext: `GET ${GITHUB_PRS_URL}` });
    },
  });

  // Deep link from the menu bar's ⌥ action: push the changelog once, on mount.
  // `push` must be called from an effect, not during render, and the ref guard keeps a
  // re-render (or the dev renderer's double-effect pass) from stacking duplicate views.
  const { push } = useNavigation();
  const deepLinked = useRef(false);
  const changelogSlug = props.launchContext?.changelogSlug;
  const changelogTitle = props.launchContext?.changelogTitle;
  useEffect(() => {
    if (deepLinked.current || !changelogSlug) return;
    deepLinked.current = true;
    push(<ChangelogDetail slug={changelogSlug} title={changelogTitle ?? changelogSlug} items={[]} currentIndex={-1} />);
  }, [changelogSlug, changelogTitle, push]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessingNew, setIsProcessingNew] = useState(false);
  const [isProcessingPRs, setIsProcessingPRs] = useState(false);

  // Read state management
  const { isRead, markAsRead, markAllAsRead, undo, loaded: readLoaded } = useReadState(trackReadStatus);

  const handleRefresh = async () => {
    const blockedMessage = await checkRefreshAllowed();
    if (blockedMessage) {
      // Not a failure — a cooldown is expected; Failure would owe a Copy Error action.
      await showToast({
        style: Toast.Style.Animated,
        title: "Please Wait Before Refreshing",
        message: blockedMessage,
      });
      return;
    }

    setIsRefreshing(true);
    try {
      await Promise.all([revalidateFeed(), revalidatePRs()]);
      await showToast({
        style: Toast.Style.Success,
        title: "Feed refreshed",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reflect the async post-processing (and the LocalStorage-backed hooks) in the
  // loading state so the list doesn't flash "No Extensions Found" prematurely.
  const isLoading =
    feedLoading ||
    prsLoading ||
    isProcessingNew ||
    isProcessingPRs ||
    !togglesLoaded ||
    (trackReadStatus && !readLoaded);

  // Get installed extensions if filter is enabled
  const installedSlugs = useMemo(() => {
    if (filter !== "my-updates") return null;
    return getInstalledExtensionSlugs();
  }, [filter]);

  const [updatedItems, setUpdatedItems] = useState<StoreItem[]>([]);
  const [removedItems, setRemovedItems] = useState<StoreItem[]>([]);
  const [newItems, setNewItems] = useState<StoreItem[]>([]);

  // Build new items and fetch their platforms from package.json
  useEffect(() => {
    if (!feedData) return;
    let cancelled = false;
    // asArray, not `?? []`: a 200 body of {"items":{}} passes the null check and then
    // throws in the mapper below.
    const items = asArray<FeedItem>(feedData.items);
    setIsProcessingNew(true);
    mapWithConcurrency(items, 8, async (item) => {
      const parsed = parseExtensionUrl(item.url);
      if (!parsed) return null;
      const { extension } = parsed;
      const pkgInfo = await fetchExtensionPackageInfo(extension);
      return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        image: item.image,
        date: item.date_modified,
        authorName: item.author.name,
        authorUrl: item.author.url,
        url: item.url,
        type: "new" as const,
        extensionSlug: extension,
        platforms: pkgInfo?.platforms ?? ["macOS"],
        version: pkgInfo?.version,
        categories: pkgInfo?.categories,
        extensionIcon: pkgInfo?.icon,
      };
    })
      .then((results) => {
        if (cancelled) return;
        setNewItems(results.filter((item): item is NonNullable<typeof item> => item !== null));
      })
      .finally(() => {
        if (!cancelled) setIsProcessingNew(false);
      });
    return () => {
      cancelled = true;
    };
  }, [feedData]);

  // Map of new-feed slugs -> publish date, with a stable identity: it only
  // changes when the (slug, date) set actually changes, not on every newItems
  // reference change. This prevents the PR effect below from re-running the
  // network-bound convertPRsToStoreItems whenever the feed merely reloads.
  const newItemDatesSignature = useMemo(
    () =>
      newItems
        .filter((i) => i.extensionSlug)
        .map((i) => `${i.extensionSlug}:${i.date}`)
        .sort()
        .join("|"),
    [newItems],
  );
  // Intentionally keyed on the stable signature rather than newItems itself, so
  // the map identity (and the PR effect below) only changes when the data does.
  const newItemDates = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of newItems) {
      if (item.extensionSlug) map.set(item.extensionSlug, item.date);
    }
    return map;
  }, [newItemDatesSignature]);

  // Fetch updated and removed items from PRs (async because we need to fetch package.json for each)
  useEffect(() => {
    if (!prsData) return;
    let cancelled = false;
    setIsProcessingPRs(true);
    convertPRsToStoreItems(prsData, newItemDates)
      .then(({ updated, removed }) => {
        if (cancelled) return;
        setUpdatedItems(updated);
        setRemovedItems(removed);
      })
      .finally(() => {
        if (!cancelled) setIsProcessingPRs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [prsData, newItemDates]);

  const allItems = useMemo(() => {
    return [...newItems, ...updatedItems, ...removedItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [newItems, updatedItems, removedItems]);

  // Categories actually present across the loaded items, so the category filter
  // never offers a dead-end (a category with zero matches).
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const item of [...newItems, ...updatedItems, ...removedItems]) {
      for (const category of item.categories ?? []) {
        if (typeof category === "string" && category.trim().length > 0) set.add(category);
      }
    }
    return [...set].sort();
  }, [newItems, updatedItems, removedItems]);

  const displayItems = useMemo(() => {
    let items: StoreItem[];
    switch (filter) {
      case "new":
        items = newItems;
        break;
      case "updated":
        items = updatedItems;
        break;
      case "my-updates":
        items = installedSlugs
          ? updatedItems.filter((item) => (item.extensionSlug ? installedSlugs.has(item.extensionSlug) : false))
          : [];
        break;
      case "removed":
        items = removedItems;
        break;
      default:
        items = allItems;
    }

    // Apply platform filter toggles
    // Extensions supporting both platforms are never filtered out.
    // These toggles only affect platform-exclusive extensions.
    // Removed extensions are exempt — their platform data is unavailable.
    items = items.filter((item) => {
      if (item.type === "removed") return true;
      const { hasMac, hasWindows } = platformSupport(item.platforms);
      const isCrossPlatform = hasMac && hasWindows;

      if (isCrossPlatform) return true;
      if (!toggles.showMacOS && hasMac && !hasWindows) return false;
      if (!toggles.showWindows && hasWindows && !hasMac) return false;
      return true;
    });

    // Refine by category / author (orthogonal to the type and platform filters).
    if (categoryFilter) {
      items = items.filter((item) => (item.categories ?? []).includes(categoryFilter));
    }
    if (authorFilter) {
      items = items.filter((item) => item.authorName === authorFilter);
    }

    // Filter out read items when tracking is enabled
    if (trackReadStatus) {
      items = items.filter((item) => !isRead(item.id));
    }

    // Sort newest-first consistently across every tab (the per-type lists are
    // otherwise in PR/feed order, not strictly by date).
    return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    filter,
    newItems,
    updatedItems,
    removedItems,
    allItems,
    toggles,
    installedSlugs,
    trackReadStatus,
    isRead,
    categoryFilter,
    authorFilter,
  ]);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(displayItems.map((item) => item.id));
  };

  const hasRefinement = categoryFilter !== null || authorFilter !== null;

  const clearRefinements = () => {
    setCategoryFilter(null);
    setAuthorFilter(null);
  };

  // Build search placeholder, reflecting the active category/author refinement
  // when present, otherwise the active platform filter.
  const searchPlaceholder = useMemo(() => {
    if (categoryFilter || authorFilter) {
      const noun = categoryFilter ? `${categoryFilter} extensions` : "extensions";
      return authorFilter ? `Search ${noun} by ${authorFilter}...` : `Search ${noun}...`;
    }
    if (toggles.showMacOS && !toggles.showWindows) return "Search macOS-only extensions...";
    if (toggles.showWindows && !toggles.showMacOS) return "Search Windows-only extensions...";
    return "Search extensions...";
  }, [categoryFilter, authorFilter, toggles.showMacOS, toggles.showWindows]);

  // Group the (already date-sorted) items into time buckets for scannability.
  // The global index into displayItems is preserved so changelog navigation
  // (Next/Previous) keeps working across sections.
  const groupedItems = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const buckets = [
      { title: "Today", min: todayMs },
      { title: "Yesterday", min: todayMs - dayMs },
      { title: "Previous 7 Days", min: todayMs - 7 * dayMs },
      { title: "Previous 30 Days", min: todayMs - 30 * dayMs },
      { title: "Earlier", min: -Infinity },
    ];

    const groups = buckets.map((b) => ({ title: b.title, items: [] as { item: StoreItem; index: number }[] }));
    displayItems.forEach((item, index) => {
      const time = new Date(item.date).getTime();
      const bucketIndex = buckets.findIndex((b) => time >= b.min);
      groups[bucketIndex === -1 ? groups.length - 1 : bucketIndex].items.push({ item, index });
    });

    return groups.filter((g) => g.items.length > 0);
  }, [displayItems]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={searchPlaceholder}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue onChange={(val) => setFilter(val as FilterValue)}>
          <List.Dropdown.Item title="Show All" value="all" icon={Icon.AppWindowGrid3x3} />
          <List.Dropdown.Item title="New" value="new" icon={Icon.StarCircle} />
          <List.Dropdown.Item title="Updates" value="updated" icon={Icon.ArrowUpCircle} />
          <List.Dropdown.Item title="My Updates" value="my-updates" icon={Icon.Person} />
          <List.Dropdown.Item title="Removed" value="removed" icon={Icon.MinusCircle} />
        </List.Dropdown>
      }
    >
      {displayItems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={hasRefinement ? "No Matches" : trackReadStatus ? "All Caught Up!" : "No Extensions Found"}
          description={
            hasRefinement
              ? "No extensions match the active category or author filter"
              : trackReadStatus
                ? "All items have been marked as read"
                : filter === "all"
                  ? "Unable to load the feed"
                  : filter === "my-updates"
                    ? "No updates found for your installed extensions"
                    : filter === "removed"
                      ? "No removed extensions found"
                      : `No ${filter} extensions found`
          }
          actions={
            hasRefinement ? (
              <ActionPanel>
                <Action title="Clear Filters" icon={Icon.XMarkCircle} onAction={clearRefinements} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        groupedItems.map((group) => (
          <List.Section key={group.title} title={group.title} subtitle={String(group.items.length)}>
            {group.items.map(({ item, index }) => (
              <ExtensionListItem
                key={item.id}
                item={item}
                items={displayItems}
                currentIndex={index}
                filter={filter}
                trackReadStatus={trackReadStatus}
                toggles={toggles}
                categoryFilter={categoryFilter}
                authorFilter={authorFilter}
                availableCategories={availableCategories}
                onSetCategory={setCategoryFilter}
                onSetAuthor={setAuthorFilter}
                onToggleMacOS={toggleMacOS}
                onToggleWindows={toggleWindows}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onUndo={undo}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
