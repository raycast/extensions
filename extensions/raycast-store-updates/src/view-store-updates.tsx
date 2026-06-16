import { List, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo, useEffect } from "react";
import { Feed, GitHubPR, StoreItem, FilterValue } from "./types";
import {
  parseExtensionUrl,
  fetchExtensionPackageInfo,
  convertPRsToStoreItems,
  getInstalledExtensionSlugs,
} from "./utils";
import { ExtensionListItem } from "./components/ExtensionListItem";
import { useReadState } from "./hooks/useReadState";
import { useFilterToggles } from "./hooks/useFilterToggles";
import { useGitHubRateLimit } from "./hooks/useGitHubRateLimit";

// =============================================================================
// Constants
// =============================================================================

const FEED_URL = "https://www.raycast.com/store/feed.json";
const GITHUB_PRS_URL =
  "https://api.github.com/repos/raycast/extensions/pulls?state=closed&sort=updated&direction=desc&per_page=50";

// =============================================================================
// Command
// =============================================================================

export default function Command() {
  const { trackReadStatus } = getPreferenceValues<Preferences>();
  const [filter, setFilter] = useState<FilterValue>("all");
  const { toggles, toggleMacOS, toggleWindows } = useFilterToggles();

  const {
    data: feedData,
    isLoading: feedLoading,
    revalidate: revalidateFeed,
  } = useFetch<Feed>(FEED_URL, {
    keepPreviousData: true,
  });

  const { checkRefreshAllowed, recordFetch, recordRateLimit } = useGitHubRateLimit();

  const {
    data: prsData,
    isLoading: prsLoading,
    revalidate: revalidatePRs,
  } = useFetch<GitHubPR[]>(GITHUB_PRS_URL, {
    keepPreviousData: true,
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
    async parseResponse(response) {
      if (response.status === 403 || response.status === 429) {
        const resetHeader = response.headers.get("X-RateLimit-Reset");
        const resetEpoch = resetHeader ? parseInt(resetHeader, 10) : undefined;
        const message = await recordRateLimit(resetEpoch);
        await showToast({ style: Toast.Style.Failure, title: "Rate Limited", message });
        // Return empty array so useFetch doesn't show its own error toast.
        return [];
      }
      const resetHeader = response.headers.get("X-RateLimit-Reset");
      const resetEpoch = resetHeader ? parseInt(resetHeader, 10) : undefined;
      await recordFetch(resetEpoch);
      return response.json() as Promise<GitHubPR[]>;
    },
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    const blockedMessage = await checkRefreshAllowed();
    if (blockedMessage) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please wait before refreshing",
        message: blockedMessage,
      });
      return;
    }

    setIsRefreshing(true);
    revalidateFeed();
    revalidatePRs();
    await showToast({
      style: Toast.Style.Success,
      title: "Feed refreshed",
    });
    setIsRefreshing(false);
  };

  const isLoading = feedLoading || prsLoading;

  // Get installed extensions if filter is enabled
  const installedSlugs = useMemo(() => {
    if (filter !== "my-updates") return null;
    return getInstalledExtensionSlugs();
  }, [filter]);

  const [updatedItems, setUpdatedItems] = useState<StoreItem[]>([]);
  const [removedItems, setRemovedItems] = useState<StoreItem[]>([]);
  const [newItems, setNewItems] = useState<StoreItem[]>([]);

  // Read state management
  const { isRead, markAsRead, markAllAsRead, undo } = useReadState(trackReadStatus);

  // Build new items and fetch their platforms from package.json
  useEffect(() => {
    if (!feedData) return;
    const items = feedData.items ?? [];
    Promise.all(
      items.map(async (item) => {
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
      }),
    ).then((results) => setNewItems(results.filter((item): item is NonNullable<typeof item> => item !== null)));
  }, [feedData]);

  // Fetch updated and removed items from PRs (async because we need to fetch package.json for each)
  useEffect(() => {
    if (!prsData) return;
    const newItemDates = new Map<string, string>();
    for (const item of newItems) {
      if (item.extensionSlug) newItemDates.set(item.extensionSlug, item.date);
    }
    convertPRsToStoreItems(prsData, newItemDates).then(({ updated, removed }) => {
      setUpdatedItems(updated);
      setRemovedItems(removed);
    });
  }, [prsData, newItems]);

  const allItems = useMemo(() => {
    return [...newItems, ...updatedItems, ...removedItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
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
      const platforms = item.platforms ?? ["macOS"];
      const hasMac = platforms.some((p) => p.toLowerCase() === "macos");
      const hasWindows = platforms.some((p) => p.toLowerCase() === "windows");
      const isCrossPlatform = hasMac && hasWindows;

      if (isCrossPlatform) return true;
      if (!toggles.showMacOS && hasMac && !hasWindows) return false;
      if (!toggles.showWindows && hasWindows && !hasMac) return false;
      return true;
    });

    // Filter out read items when tracking is enabled
    if (trackReadStatus) {
      items = items.filter((item) => !isRead(item.id));
    }

    return items;
  }, [filter, newItems, updatedItems, removedItems, allItems, toggles, installedSlugs, trackReadStatus, isRead]);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(displayItems.map((item) => item.id));
  };

  // Build search placeholder based on active platform filters
  const searchPlaceholder = useMemo(() => {
    if (toggles.showMacOS && !toggles.showWindows) return "Search macOS-only extensions...";
    if (toggles.showWindows && !toggles.showMacOS) return "Search Windows-only extensions...";
    return "Search extensions...";
  }, [toggles.showMacOS, toggles.showWindows]);

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
          title={trackReadStatus ? "All Caught Up!" : "No Extensions Found"}
          description={
            trackReadStatus
              ? "All items have been marked as read"
              : filter === "all"
                ? "Unable to load the feed"
                : filter === "my-updates"
                  ? "No updates found for your installed extensions"
                  : filter === "removed"
                    ? "No removed extensions found"
                    : `No ${filter} extensions found`
          }
        />
      ) : (
        displayItems.map((item, index) => (
          <ExtensionListItem
            key={item.id}
            item={item}
            items={displayItems}
            currentIndex={index}
            filter={filter}
            trackReadStatus={trackReadStatus}
            toggles={toggles}
            onToggleMacOS={toggleMacOS}
            onToggleWindows={toggleWindows}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onUndo={undo}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        ))
      )}
    </List>
  );
}
