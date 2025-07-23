import { List, Icon } from "@raycast/api";
import { HistoryActionPanels } from "./components";
import React, { useEffect, useState } from "react";
import { getUsageHistory, getAppFavicon, removeUsageHistoryItem } from "./hooks/apps";
import { openProfile } from "./utils/open-profile";
import { getAppByValue } from "./utils/custom-app-utils";
import { formatRelativeDate } from "../utils/date";
import OpenProfileCommand from "./open-profile";
import { HistoryItemWithFavicon } from "./types";

export default function HistoryCommand() {
  const [historyItems, setHistoryItems] = useState<HistoryItemWithFavicon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [appFilter, setAppFilter] = useState<string>("__all__");

  const loadHistoryData = async () => {
    try {
      setIsLoading(true);
      const usageHistory = await getUsageHistory();

      // Load favicons for each history item
      const itemsWithFavicons = await Promise.all(
        usageHistory.map(async (item) => {
          const app = await getAppByValue(item.app);
          const favicon = app ? getAppFavicon(app) : Icon.Globe;
          return { ...item, favicon };
        }),
      );

      setHistoryItems(itemsWithFavicons);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, []);

  // Compute unique apps from historyItems (including "Show All")
  const uniqueApps = React.useMemo(() => {
    const appSet = new Set(historyItems.map((item) => item.app));
    const apps = Array.from(appSet).map((appValue) => {
      const item = historyItems.find((h) => h.app === appValue);
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
  const filteredItems = historyItems.filter((item) => {
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
      item.username.toLowerCase().includes(searchLower) ||
      item.appName.toLowerCase().includes(searchLower) ||
      item.app.toLowerCase().includes(searchLower)
    );
  });

  // Handle opening a profile from history
  const handleOpenProfile = async (username: string, appValue: string) => {
    await openProfile(username, appValue, false); // Don't pop to root to keep history intact
  };

  // Filter by specific app
  const filterByApp = (appValue: string) => {
    setAppFilter(appValue);
  };

  // Handle deleting a history item
  const handleDeleteHistoryItem = async (username: string, app: string) => {
    try {
      await removeUsageHistoryItem(username, app);
      // Update local state by filtering out the deleted item
      const filteredHistoryItems = historyItems.filter((item) => !(item.username === username && item.app === app));
      setHistoryItems(filteredHistoryItems);
    } catch (error) {
      console.error("Error deleting history item:", error);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by username or app..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by App"
          storeValue={true}
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
              key={`${item.username}-${item.app}-${item.timestamp}-${index}`}
              title={`@${item.username}`}
              subtitle={item.appName}
              icon={item.favicon || Icon.Globe}
              accessories={[
                formatRelativeDate(item.timestamp),
                {
                  text: item.appName,
                  icon: item.favicon || Icon.Globe,
                },
              ]}
              actions={
                <HistoryActionPanels
                  item={{
                    username: item.username,
                    app: item.app,
                    appName: item.appName,
                    favicon: typeof item.favicon === 'string' ? item.favicon : undefined,
                  }}
                  onOpenProfile={handleOpenProfile}
                  onDeleteHistoryItem={handleDeleteHistoryItem}
                  onSetSearchText={setSearchText}
                  onSetAppFilter={setAppFilter}
                  onFilterByApp={filterByApp}
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
