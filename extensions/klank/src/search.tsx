/**
 * Search Klank command for Raycast
 * Allows users to search their tracks, albums, playlists, teams, and more
 */

import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { fetchSearchItems, getItemUrl, getApiUrl } from "./api";
import { type SearchableItem, type SearchableItemType } from "./types";

/**
 * Map icon keys to Raycast icons
 */
function getIcon(item: SearchableItem): Icon {
  const iconMap: Record<string, Icon> = {
    home: Icon.House,
    calendar: Icon.Calendar,
    link: Icon.Link,
    fileText: Icon.Document,
    users: Icon.TwoPeople,
    email: Icon.Envelope,
    tour: Icon.Airplane,
    flag: Icon.Flag,
    folder: Icon.Folder,
    disc: Icon.Cd,
    upload: Icon.Upload,
    download: Icon.Download,
    dollarSign: Icon.BankNote,
    bookOpen: Icon.Book,
    music: Icon.Music,
    album: Icon.Cd,
    queue: Icon.List,
    settings: Icon.Gear,
    addressBook: Icon.AddressBook,
    uploadCloud: Icon.Cloud,
    user: Icon.Person,
    creditCard: Icon.CreditCard,
    bell: Icon.Bell,
    globe: Icon.Globe,
    layoutDashboard: Icon.AppWindowGrid3x3,
    send: Icon.PaperAirplane,
    sparkles: Icon.Stars,
    spotify: Icon.Music,
    apple: Icon.Music,
    tag: Icon.Tag,
    edit: Icon.Pencil,
    versions: Icon.Clock,
    analytics: Icon.BarChart,
    wallet: Icon.Wallet,
    share: Icon.Link,
    track: Icon.Music,
    ticket: Icon.Ticket,
  };

  if (item.iconKey && iconMap[item.iconKey]) {
    return iconMap[item.iconKey];
  }

  // Default icons by type
  const typeIconMap: Record<SearchableItemType, Icon> = {
    track: Icon.Music,
    album: Icon.Cd,
    playlist: Icon.List,
    team: Icon.TwoPeople,
    tour: Icon.Airplane,
    event: Icon.Ticket,
    demo: Icon.Cd,
    navigation: Icon.ArrowRight,
    action: Icon.Bolt,
    contact: Icon.Person,
    import: Icon.Download,
    account: Icon.Person,
    public: Icon.Globe,
    filter: Icon.Filter,
  };

  return typeIconMap[item.type] || Icon.Circle;
}

/**
 * Get color for item based on type
 */
function getItemColor(item: SearchableItem): Color | undefined {
  if (item.teamColor) {
    return item.teamColor as Color;
  }

  const colorMap: Partial<Record<SearchableItemType, Color>> = {
    track: Color.Blue,
    album: Color.Purple,
    playlist: Color.Green,
    team: Color.Orange,
    tour: Color.Red,
    event: Color.Yellow,
    demo: Color.Magenta,
    navigation: Color.SecondaryText,
    action: Color.PrimaryText,
  };

  return colorMap[item.type];
}

/**
 * Get accessories for list item
 */
function getAccessories(item: SearchableItem): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (item.status) {
    const statusColor =
      item.status === "released" ? Color.Green : Color.SecondaryText;
    accessories.push({
      tag: { value: item.status.replace(/_/g, " "), color: statusColor },
    });
  }

  if (item.teamName) {
    accessories.push({
      tag: { value: item.teamName, color: Color.Orange },
    });
  }

  if (item.disabled) {
    accessories.push({
      icon: { source: Icon.Lock, tintColor: Color.SecondaryText },
      tooltip: item.disabledReason || "Requires upgrade",
    });
  }

  return accessories;
}

/**
 * Filter items based on search query
 */
function filterItems(items: SearchableItem[], query: string): SearchableItem[] {
  if (!query.trim()) {
    // Show navigation items by default when no search query
    return items
      .filter((item) => item.type === "navigation")
      .toSorted((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 20);
  }

  const lowerQuery = query.toLowerCase();

  return items
    .filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(lowerQuery);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(lowerQuery);
      const matchKeywords = item.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(lowerQuery),
      );
      const matchCategory = item.category?.toLowerCase().includes(lowerQuery);

      return matchTitle || matchSubtitle || matchKeywords || matchCategory;
    })
    .toSorted((a, b) => {
      // Exact title matches first
      const aExact = a.title.toLowerCase() === lowerQuery;
      const bExact = b.title.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Then by priority
      return (b.priority || 0) - (a.priority || 0);
    })
    .slice(0, 50);
}

/**
 * Group items by category
 */
function groupByCategory(
  items: SearchableItem[],
): Record<string, SearchableItem[]> {
  const groups: Record<string, SearchableItem[]> = {};

  for (const item of items) {
    const category = item.category || item.type;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
  }

  return groups;
}

export default function SearchCommand() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      const result = await fetchSearchItems();
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return filterItems(data.items, searchText);
  }, [data?.items, searchText]);

  const groupedItems = useMemo(
    () => groupByCategory(filteredItems),
    [filteredItems],
  );

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load items",
      message: error.message,
    });
  }

  const apiUrl = getApiUrl();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tracks, albums, playlists..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {Object.entries(groupedItems).map(([category, items]) => (
        <List.Section key={category} title={category}>
          {items.map((item) => (
            <List.Item
              key={item.id}
              icon={{
                source: getIcon(item),
                tintColor: getItemColor(item),
              }}
              title={item.title}
              subtitle={item.subtitle}
              accessories={getAccessories(item)}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {item.url && !item.disabled && (
                      <Action
                        title="Open in Browser"
                        icon={Icon.Globe}
                        onAction={() => {
                          open(getItemUrl(item));
                        }}
                      />
                    )}
                    {item.disabled && item.upgradeUrl && (
                      <Action
                        title="Upgrade Plan"
                        icon={Icon.Star}
                        onAction={() => {
                          open(`${apiUrl}${item.upgradeUrl}`);
                        }}
                      />
                    )}
                    {item.url && (
                      <Action.CopyToClipboard
                        title="Copy URL"
                        content={getItemUrl(item)}
                        shortcut={{
                          modifiers: ["cmd"],
                          key: "c",
                        }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{
                        modifiers: ["cmd"],
                        key: "r",
                      }}
                      onAction={() => revalidate()}
                    />
                    <Action
                      title="Open Klank"
                      icon={Icon.Globe}
                      shortcut={{
                        modifiers: ["cmd", "shift"],
                        key: "o",
                      }}
                      onAction={() => open(apiUrl)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {!isLoading && filteredItems.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results found"
          description={
            searchText
              ? `No items matching "${searchText}"`
              : "Start typing to search your Klank workspace"
          }
        />
      )}
    </List>
  );
}
