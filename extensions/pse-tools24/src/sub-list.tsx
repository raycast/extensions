import { List, openExtensionPreferences, Action, ActionPanel, Icon, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { SubRecord, getSubRecords, clearSubRecordsCache } from "./sub-list/api";

import SubListItem from "./sub-list/SubListItem";

export default function Command() {
  const [subs, setSubs] = useState<SubRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadSubRecords = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      }

      const subRecords = await getSubRecords(forceRefresh);
      if (subRecords) {
        setSubs(subRecords);
        setLastUpdated(new Date());
        if (forceRefresh) {
          await showToast({
            title: "Sub list refreshed",
            message: `Found ${subRecords.length} subscriptions`,
          });
        }
      } else {
        showFailureToast("Could not fetch subs", {
          title: "Reset Session Cookie?",
          primaryAction: {
            title: "Reset Cookie",
            onAction: openExtensionPreferences,
          },
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      showFailureToast("Failed to load subs", {
        title: errorMessage,
        primaryAction: {
          title: "Reset Cookie",
          onAction: openExtensionPreferences,
        },
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubRecords();
  }, []);

  const handleRefresh = async () => {
    await loadSubRecords(true);
  };

  const handleClearCache = async () => {
    try {
      await clearSubRecordsCache();
      setSubs([]);
      setLastUpdated(null);
      await showToast({
        title: "Cache cleared",
        message: "Sub list cache has been cleared",
      });
    } catch (error) {
      showFailureToast("Failed to clear cache");
    }
  };

  const generateListItems = () => {
    return subs.map((sub) => {
      return <SubListItem key={sub.instance} {...sub} />;
    });
  };

  return (
    <List
      isLoading={isLoading || isRefreshing}
      navigationTitle="Sub Search"
      searchBarPlaceholder="Search by sub or (rproxy, bqio, nuke, etc.)"
      actions={
        <ActionPanel title="Sub List Actions">
          <Action
            title="Refresh Sub List"
            icon={Icon.ArrowClockwise}
            onAction={handleRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Clear Cache"
            icon={Icon.Trash}
            onAction={handleClearCache}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {lastUpdated && (
        <List.Item
          title={`Last updated: ${lastUpdated.toLocaleString()}`}
          accessories={[{ text: `${subs.length} subscriptions` }, { icon: Icon.Info }]}
        />
      )}
      {subs && generateListItems()}
    </List>
  );
}
