import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  closeMainWindow,
  useNavigation,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import React, { useEffect } from "react";
import { subscribeToHistory, getCurrentHistory } from "../context/BrowserStore";
import { HistoryItem, BridgeMessage, DisplayTab } from "../types";
import { formatTimeAgo, getTabIcon, getActionShortcut } from "../helpers";

interface BrowserHistoryViewProps {
  sendToSocket?: (msg: BridgeMessage) => void;
  title?: string;
  browserFilter: string;
  windowFilter?: string;
  requestData?: (channel: string) => void;
  navigateCurrentTab?: (url: string, tabs: DisplayTab[]) => void;
  allTabs?: DisplayTab[];
  onClose?: () => void;
}

export function BrowserHistoryView({
  onClose,
  sendToSocket,
  title = "Browser History",
  browserFilter,
  windowFilter,
  requestData,
  navigateCurrentTab,
  allTabs,
}: BrowserHistoryViewProps) {
  const { pop } = useNavigation();

  useEffect(() => {
    return () => {
      if (onClose) onClose();
    };
  }, [onClose]);

  // V320: Live history subscription
  const [liveHistory, setLiveHistory] = React.useState<HistoryItem[]>(() => {
    const current = getCurrentHistory() as HistoryItem[];
    return current.length > 0 ? current : [];
  });

  useEffect(() => {
    const unsubscribe = subscribeToHistory((freshHistory) => {
      if (freshHistory.length > 0) {
        setLiveHistory(freshHistory as HistoryItem[]);
      }
    });
    return unsubscribe;
  }, []);

  // V400: Subscription lifecycle — tell browser to start/stop pulling history
  useEffect(() => {
    if (requestData) {
      requestData("history");
    }
    if (sendToSocket) {
      sendToSocket({ type: "START_SUBSCRIPTION", channel: "history" });
    }
    return () => {
      if (sendToSocket) {
        sendToSocket({ type: "STOP_SUBSCRIPTION", channel: "history" });
      }
    };
  }, [requestData, sendToSocket]);

  const filteredHistory = React.useMemo(() => {
    if (browserFilter === "all") return liveHistory;
    return liveHistory.filter((item) => {
      // History IDs from bridge follow the pattern "browserName-originalId"
      const idStr = item.id?.toString() || "";
      return idStr.startsWith(`${browserFilter}-`);
    });
  }, [liveHistory, browserFilter]);

  const groupHistoryByDate = true;

  const historyGroups = React.useMemo(() => {
    if (!groupHistoryByDate) return [];

    const groupsMap = filteredHistory.reduce(
      (groups: Record<string, { groupName: string; sortTime: number; items: HistoryItem[] }>, item) => {
        const lastVisit = item.lastVisitTime || 0;
        const ms = lastVisit < 10000000000 ? lastVisit * 1000 : lastVisit;
        const date = new Date(ms);
        const now = new Date();

        const isToday =
          date.getDate() === now.getDate() &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear();

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday =
          date.getDate() === yesterday.getDate() &&
          date.getMonth() === yesterday.getMonth() &&
          date.getFullYear() === yesterday.getFullYear();

        let groupName = "";
        let sortTime = date.getTime();

        if (isToday) {
          groupName = "Today";
          sortTime = now.getTime();
        } else if (isYesterday) {
          groupName = "Yesterday";
          sortTime = now.getTime() - 86400000;
        } else {
          const diffTime = Math.abs(now.getTime() - date.getTime());
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const dateStr = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
          groupName = `${dateStr} (${diffDays} days ago)`;
          sortTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        }

        if (!groups[groupName]) {
          groups[groupName] = { groupName, sortTime, items: [] };
        }
        groups[groupName].items.push(item);
        return groups;
      },
      {},
    );

    return Object.values(groupsMap).sort((a, b) => b.sortTime - a.sortTime);
  }, [filteredHistory, groupHistoryByDate]);

  return (
    <List navigationTitle={title} searchBarPlaceholder={`Search ${title.toLowerCase()}...`}>
      {filteredHistory.length === 0 ? (
        <List.EmptyView
          title={`No ${title.toLowerCase()} found`}
          description="Your browser history will appear here."
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action
                title="Back to Tabs"
                icon={Icon.XMarkCircle}
                shortcut={getActionShortcut("history") || { modifiers: ["ctrl"], key: "h" }}
                onAction={pop}
              />
            </ActionPanel>
          }
        />
      ) : groupHistoryByDate ? (
        historyGroups.map((group) => (
          <List.Section key={group.groupName} title={group.groupName} subtitle={`${group.items.length} items`}>
            {group.items.map((item) => (
              <HistoryListItem
                key={item.id}
                item={item}
                pop={pop}
                sendToSocket={sendToSocket}
                windowFilter={windowFilter}
                navigateCurrentTab={navigateCurrentTab}
                allTabs={allTabs}
              />
            ))}
          </List.Section>
        ))
      ) : (
        filteredHistory.map((item) => (
          <HistoryListItem
            key={item.id}
            item={item}
            pop={pop}
            sendToSocket={sendToSocket}
            windowFilter={windowFilter}
            navigateCurrentTab={navigateCurrentTab}
            allTabs={allTabs}
          />
        ))
      )}
    </List>
  );
}

function HistoryListItem({
  item,
  pop,
  sendToSocket,
  windowFilter,
  navigateCurrentTab,
  allTabs,
}: {
  item: HistoryItem;
  pop: () => void;
  sendToSocket?: (msg: BridgeMessage) => void;
  windowFilter?: string;
  navigateCurrentTab?: (url: string, tabs: DisplayTab[]) => void;
  allTabs?: DisplayTab[];
}) {
  return (
    <List.Item
      title={item.title || "Unknown Page"}
      subtitle={(() => {
        try {
          return item.url ? new URL(item.url).hostname : "";
        } catch {
          return item.url?.split("/")[2] || "";
        }
      })()}
      icon={getTabIcon(item)}
      accessories={[{ text: formatTimeAgo(item.lastVisitTime), tooltip: "Visit Time" }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Primary">
            <Action
              title="Open in New Tab"
              icon={{ source: Icon.Globe, tintColor: Color.Blue }}
              onAction={async () => {
                if (item.url) {
                  if (sendToSocket) {
                    await closeMainWindow({ clearRootSearch: true });
                    const idStr = item.id?.toString() || "";
                    const browserName = idStr.includes("-") ? idStr.substring(0, idStr.indexOf("-")) : idStr;
                    sendToSocket({
                      type: "CREATE_TAB",
                      url: item.url,
                      browser: browserName,
                      windowId: windowFilter,
                    });
                  } else {
                    await open(item.url);
                    await closeMainWindow();
                  }
                }
              }}
            />
            {navigateCurrentTab && (
              <Action
                title="Open in Current Tab"
                icon={{ source: Icon.Window, tintColor: Color.Blue }}
                onAction={() => item.url && navigateCurrentTab(item.url, allTabs || [])}
              />
            )}
            {sendToSocket && item.url && (
              <Action
                title="Open in Background"
                icon={{ source: Icon.AppWindowList, tintColor: Color.Blue }}
                shortcut={{ modifiers: ["shift"], key: "enter" }}
                onAction={() => {
                  const idStr = item.id?.toString() || "";
                  const browserName = idStr.includes("-") ? idStr.substring(0, idStr.indexOf("-")) : idStr;
                  sendToSocket({
                    type: "CREATE_TAB_BACKGROUND",
                    url: item.url,
                    browser: browserName,
                    windowId: windowFilter,
                  });
                  showToast({ style: Toast.Style.Success, title: "Opened in background", message: item.title });
                }}
              />
            )}
          </ActionPanel.Section>

          {sendToSocket && (
            <ActionPanel.Section title="History Management">
              <Action
                title="Clear Item from History"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "d" }}
                onAction={() => {
                  if (item.url) {
                    sendToSocket({
                      type: "DELETE_HISTORY_ITEM",
                      url: item.url,
                    });
                    showToast({ style: Toast.Style.Success, title: "Cleared history item", message: item.title });
                  }
                }}
              />
              <Action
                title="Delete Full History"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => {
                  sendToSocket({
                    type: "DELETE_ALL_HISTORY",
                  });
                  showToast({ style: Toast.Style.Success, title: "Cleared entire browser history" });
                }}
              />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section title="Navigation">
            <Action
              title="Back to Tabs"
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Yellow }}
              shortcut={getActionShortcut("history") || { modifiers: ["ctrl"], key: "h" }}
              onAction={pop}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
