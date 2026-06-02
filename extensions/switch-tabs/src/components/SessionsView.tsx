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
import { subscribeToSessions, getCurrentSessions } from "../context/BrowserStore";
import { HistoryItem, DisplayTab, BridgeMessage } from "../types";
import { formatTimeAgo, getTabIcon, getActionShortcut, forceCopy } from "../helpers";

interface RecentTabsViewProps {
  onClose?: () => void;
  sendToSocket?: (msg: BridgeMessage) => void;
  title?: string;
  browserFilter: string;
  windowFilter?: string;
  requestData?: (channel: string) => void;
  navigateCurrentTab?: (url: string, tabs: DisplayTab[]) => void;
  allTabs?: DisplayTab[];
}

export function SessionsView({
  onClose,
  sendToSocket,
  title = "Recently Closed Tabs",
  browserFilter,
  windowFilter,
  requestData,
  navigateCurrentTab,
  allTabs,
}: RecentTabsViewProps) {
  const { pop } = useNavigation();

  // V44: Universal Rebuild - Trigger onClose on unmount so Backspace/ESC also refresh the list
  useEffect(() => {
    return () => {
      if (onClose) onClose();
    };
  }, [onClose]);

  // V320: Live sessions subscription
  const [liveSessions, setLiveSessions] = React.useState<HistoryItem[]>(() => {
    const current = getCurrentSessions() as HistoryItem[];
    return current.length > 0 ? current : [];
  });

  useEffect(() => {
    const unsubscribe = subscribeToSessions((freshSessions) => {
      if (freshSessions.length > 0) {
        setLiveSessions(freshSessions as HistoryItem[]);
      }
    });
    return unsubscribe;
  }, []);

  // V400: Subscription lifecycle — tell browser to start/stop pulling sessions
  useEffect(() => {
    if (requestData) {
      requestData("sessions");
    }
    if (sendToSocket) {
      sendToSocket({ type: "START_SUBSCRIPTION", channel: "sessions" });
    }
    return () => {
      if (sendToSocket) {
        sendToSocket({ type: "STOP_SUBSCRIPTION", channel: "sessions" });
      }
    };
  }, [requestData, sendToSocket]);

  const filteredSessions = React.useMemo(() => {
    if (browserFilter === "all") return liveSessions;
    return liveSessions.filter((item) => {
      // Session IDs from bridge follow the pattern "browserName-originalId"
      const idStr = item.id?.toString() || "";
      return idStr.startsWith(`${browserFilter}-`);
    });
  }, [liveSessions, browserFilter]);

  const groupSessionsByDate = true;

  const sessionGroups = React.useMemo(() => {
    if (!groupSessionsByDate) return [];

    const groupsMap = filteredSessions.reduce(
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
  }, [filteredSessions, groupSessionsByDate]);

  return (
    <List navigationTitle={title} searchBarPlaceholder={`Search ${title.toLowerCase()}...`}>
      {filteredSessions.length === 0 ? (
        <List.EmptyView
          title={`No ${title.toLowerCase()} found`}
          description="Recently closed tabs will appear here."
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action
                title="Back to Tabs"
                icon={Icon.XMarkCircle}
                shortcut={getActionShortcut("sessions") || { modifiers: ["alt"], key: "x" }}
                onAction={pop}
              />
            </ActionPanel>
          }
        />
      ) : groupSessionsByDate ? (
        sessionGroups.map((group) => (
          <List.Section key={group.groupName} title={group.groupName} subtitle={`${group.items.length} items`}>
            {group.items.map((item) => (
              <SessionListItem
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
        filteredSessions.map((item) => (
          <SessionListItem
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

function SessionListItem({
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
      accessories={[{ text: formatTimeAgo(item.lastVisitTime), tooltip: "Closed Time" }]}
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
                    // V104: Targeted restoration with robust browser name extraction
                    const idStr = item.id?.toString() || "";
                    const browserName = idStr.includes("-") ? idStr.substring(0, idStr.indexOf("-")) : idStr;
                    sendToSocket({
                      type: "RESTORE_SESSION",
                      sessionId: item.id.includes("-") ? item.id.split("-")[1] : item.id,
                      browser: browserName,
                      windowId: windowFilter,
                      url: item.url, // Fallback
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
                shortcut={getActionShortcut("searchCurrent") || { modifiers: ["ctrl"], key: "enter" }}
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

          <ActionPanel.Section title="Navigation">
            <Action
              title="Back to Tabs"
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Yellow }}
              shortcut={getActionShortcut("sessions") || { modifiers: ["alt"], key: "x" }}
              onAction={pop}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Utilities">
            <Action
              title="Copy URL"
              icon={{ source: Icon.CopyClipboard, tintColor: Color.SecondaryText }}
              shortcut={{ modifiers: ["shift"], key: "c" }}
              onAction={() => {
                forceCopy(item.url || "");
                showToast({ style: Toast.Style.Success, title: "Copied URL", message: item.url });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
