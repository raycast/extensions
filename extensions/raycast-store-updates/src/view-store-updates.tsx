import { List, Icon, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo, useEffect } from "react";
import { Feed, GitHubPR, StoreItem, FilterValue } from "./types";
import { parseExtensionUrl, fetchExtensionPackageInfo, convertPRsToStoreItems } from "./utils";
import { ExtensionListItem } from "./components/ExtensionListItem";

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
  const { platformFilter } = getPreferenceValues<Preferences>();
  const [filter, setFilter] = useState<FilterValue>("all");

  const { data: feedData, isLoading: feedLoading } = useFetch<Feed>(FEED_URL, {
    keepPreviousData: true,
  });

  const { data: prsData, isLoading: prsLoading } = useFetch<GitHubPR[]>(GITHUB_PRS_URL, {
    keepPreviousData: true,
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  });

  const isLoading = feedLoading || prsLoading;

  const [updatedItems, setUpdatedItems] = useState<StoreItem[]>([]);

  const [newItems, setNewItems] = useState<StoreItem[]>([]);

  // Build new items and fetch their platforms from package.json
  useEffect(() => {
    if (!feedData) return;
    const items = feedData.items ?? [];
    Promise.all(
      items.map(async (item) => {
        const { extension } = parseExtensionUrl(item.url);
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
        };
      }),
    ).then(setNewItems);
  }, [feedData]);

  // Fetch updated items from PRs (async because we need to fetch package.json for each)
  useEffect(() => {
    if (!prsData) return;
    const newSlugs = new Set(newItems.map((i) => i.extensionSlug).filter(Boolean));
    convertPRsToStoreItems(prsData, newSlugs as Set<string>).then(setUpdatedItems);
  }, [prsData, newItems]);

  const allItems = useMemo(() => {
    return [...newItems, ...updatedItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [newItems, updatedItems]);

  const displayItems = useMemo(() => {
    let items: StoreItem[];
    switch (filter) {
      case "new":
        items = newItems;
        break;
      case "updated":
        items = updatedItems;
        break;
      default:
        items = allItems;
    }

    // Apply platform preference filter
    if (platformFilter && platformFilter !== "all") {
      const targetPlatform = platformFilter === "windows" ? "windows" : "macos";
      items = items.filter(
        (item) => item.platforms?.some((p) => p.toLowerCase() === targetPlatform) ?? targetPlatform === "macos",
      );
    }

    return items;
  }, [filter, newItems, updatedItems, allItems, platformFilter]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={
        platformFilter === "macOS"
          ? "Search macOS extensions..."
          : platformFilter === "windows"
            ? "Search Windows extensions..."
            : "Search extensions..."
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue onChange={(val) => setFilter(val as FilterValue)}>
          <List.Dropdown.Item title="Show All" value="all" />
          <List.Dropdown.Item title="New Only" value="new" />
          <List.Dropdown.Item title="Updated Only" value="updated" />
        </List.Dropdown>
      }
    >
      {displayItems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Extensions Found"
          description={filter === "all" ? "Unable to load the feed" : `No ${filter} extensions found`}
        />
      ) : (
        displayItems.map((item) => (
          <ExtensionListItem key={item.id} item={item} filter={filter} platformFilter={platformFilter} />
        ))
      )}
    </List>
  );
}
