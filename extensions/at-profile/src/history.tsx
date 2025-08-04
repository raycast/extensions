import React from "react";
import { List, Icon } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { HistoryActionPanels } from "./components";
import { getUsageHistory, getAppFavicon, removeUsageHistoryItem } from "./helpers/apps";
import { openProfile } from "./helpers/open-profile";
import { getAppByValue } from "./helpers/custom-app-utils";
import { safeAsyncOperation } from "./utils/errors";
import { formatRelativeDate } from "./utils/date";
import OpenProfileCommand from "./open-profile";

export default function HistoryCommand() {
  const {
    data: historyItems,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const usageHistory = await getUsageHistory();

      // Load favicons for each history item and generate URLs
      const itemsWithFavicons = await Promise.all(
        usageHistory.map(async (item) => {
          const app = await getAppByValue(item.app);
          const favicon = app ? getAppFavicon(app) : Icon.Globe;

          // Generate URL for the history item
          let url = "";
          if (app) {
            const requiresAtSymbol = app.urlTemplate.includes("@{profile}");
            const profileToUse = requiresAtSymbol
              ? item.profile.startsWith("@")
                ? item.profile
                : `@${item.profile}`
              : item.profile.startsWith("@")
                ? item.profile.slice(1)
                : item.profile;
            url = app.urlTemplate.replace("{profile}", profileToUse);
          }

          return { ...item, favicon, url };
        }),
      );

      return itemsWithFavicons;
    },
    [],
    { keepPreviousData: true },
  );

  const { value: searchText = "", setValue: setSearchText } = useLocalStorage<string>("history-search-text", "");
  const { value: appFilter = "__all__", setValue: setAppFilter } = useLocalStorage<string>(
    "history-app-filter",
    "__all__",
  );

  // Compute unique apps from historyItems (including "Show All")
  const uniqueApps = React.useMemo(() => {
    const items = historyItems ?? [];
    const appSet = new Set(items.map((item) => item.app));
    const apps = Array.from(appSet).map((appValue) => {
      const item = items.find((h) => h.app === appValue);
      return {
        value: appValue,
        name: item?.appName || appValue,
        favicon: item?.favicon,
      };
    });
    // Sort apps alphabetically by name
    apps.sort((a, b) => a.name.localeCompare(b.name));
    return [{ value: "__all__", name: "Show All", favicon: undefined }, ...apps];
  }, [historyItems]);

  // Filter items - first by appFilter (unless "all"), then by searchText
  const filteredItems = (historyItems ?? []).filter((item) => {
    // First filter by app
    if (appFilter !== "__all__" && item.app !== appFilter) {
      return false;
    }

    // Then filter by search text
    if (searchText.trim() === "") {
      return true;
    }

    const searchLower = searchText.toLowerCase();
    return (
      item.profile.toLowerCase().includes(searchLower) ||
      item.appName.toLowerCase().includes(searchLower) ||
      item.app.toLowerCase().includes(searchLower)
    );
  });

  // Handle opening a profile from history
  const handleOpenProfile = async (profile: string, appValue: string) => {
    // Don't pop to root to keep history intact, and bypass app settings since this is a direct action from history
    await openProfile(profile, appValue, false, true);
  };

  // Filter by specific app
  const filterByApp = (appValue: string) => {
    setAppFilter(appValue);
  };

  // Handle deleting a history item
  const handleDeleteHistoryItem = async (profile: string, app: string) => {
    await safeAsyncOperation(
      async () => {
        await removeUsageHistoryItem(profile, app);
        // Refresh cached history after deletion
        await revalidate();
      },
      "deleting history item",
      {
        showToastOnError: true,
        rethrow: false,
      },
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by profile or app..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by App"
          storeValue={true}
          value={appFilter}
          onChange={(newValue) => setAppFilter(newValue || "__all__")}
        >
          {uniqueApps.map((app) => (
            <List.Dropdown.Item key={app.value} title={app.name} value={app.value} icon={app.favicon || Icon.Globe} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Recent Profile History" subtitle={`${filteredItems.length} items`}>
        {filteredItems.length === 0 ? (
          <List.Item title="No History Found" subtitle="No profile history matches your search" icon={Icon.Info} />
        ) : (
          filteredItems.map((item, index) => (
            <List.Item
              key={`${item.profile}-${item.app}-${item.timestamp}-${index}`}
              title={`@${item.profile}`}
              subtitle={item.appName}
              icon={item.favicon || Icon.Globe}
              accessories={[{ text: formatRelativeDate(item.timestamp) }]}
              actions={
                <HistoryActionPanels
                  item={{
                    profile: item.profile,
                    app: item.app,
                    appName: item.appName,
                    favicon: typeof item.favicon === "string" ? item.favicon : undefined,
                    url: item.url || "",
                    timestamp: item.timestamp,
                  }}
                  onOpenProfile={handleOpenProfile}
                  onDeleteHistoryItem={handleDeleteHistoryItem}
                  onSetSearchText={setSearchText}
                  onSetAppFilter={setAppFilter}
                  onFilterByApp={filterByApp}
                  onRefreshHistory={revalidate}
                  OpenProfileCommand={OpenProfileCommand}
                />
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
