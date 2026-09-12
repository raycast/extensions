import { Action, ActionPanel, Icon, List, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  isKittyRunning,
  isSocketAvailable,
  listAll,
  focusTab,
  closeTab,
  activateKitty,
  classifyError,
} from "./utils/kitty-remote";
import { SetupGuide } from "./utils/components";
import type { KittyOSWindow, KittyTab } from "./utils/types";

interface TabItem {
  osWindowId: number;
  tab: KittyTab;
  cwd: string;
  windowCount: number;
  isFocused: boolean;
}

function flattenTabs(osWindows: KittyOSWindow[]): TabItem[] {
  const items: TabItem[] = [];
  for (const osWin of osWindows) {
    for (const tab of osWin.tabs) {
      const focusedWindow = tab.windows.find((w) => w.is_focused) || tab.windows[0];
      items.push({
        osWindowId: osWin.id,
        tab,
        cwd: focusedWindow?.cwd || "",
        windowCount: tab.windows.length,
        isFocused: osWin.is_focused && tab.is_focused,
      });
    }
  }
  return items;
}

export default function Command() {
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  const loadTabs = async () => {
    setIsLoading(true);
    try {
      if (!isKittyRunning()) {
        setTabs([]);
        setIsLoading(false);
        await showToast({ style: Toast.Style.Failure, title: "Kitty is not running" });
        return;
      }
      if (!isSocketAvailable()) {
        setShowSetup(true);
        setIsLoading(false);
        return;
      }
      const osWindows = listAll();
      setTabs(flattenTabs(osWindows));
    } catch (error) {
      const kind = classifyError(error);
      if (kind === "no_socket" || kind === "remote_disabled") {
        setShowSetup(true);
      } else {
        await showToast({ style: Toast.Style.Failure, title: "Failed to list tabs", message: String(error) });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTabs();
  }, []);

  if (showSetup) {
    return <SetupGuide />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Kitty tabs...">
      {tabs.length === 0 && !isLoading ? (
        <List.EmptyView title="No tabs found" description="Open a Kitty window first" />
      ) : (
        tabs.map((item) => (
          <List.Item
            key={`${item.osWindowId}-${item.tab.id}`}
            title={item.tab.title}
            subtitle={item.cwd}
            accessories={[
              ...(item.windowCount > 1 ? [{ text: `${item.windowCount} panes` }] : []),
              ...(item.isFocused ? [{ icon: Icon.Eye, tooltip: "Focused" }] : []),
              { text: `Window ${item.osWindowId}` },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Focus Tab"
                  icon={Icon.Window}
                  onAction={async () => {
                    try {
                      focusTab(item.tab.id);
                      activateKitty();
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to focus tab",
                        message: String(error),
                      });
                    }
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Tab Title"
                  content={item.tab.title}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
                <Action
                  title="Copy Working Directory"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={async () => {
                    await Clipboard.copy(item.cwd);
                    await showToast({ style: Toast.Style.Success, title: "Copied", message: item.cwd });
                  }}
                />
                <Action
                  title="Close Tab"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={async () => {
                    try {
                      closeTab(item.tab.id);
                      await loadTabs();
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to close tab",
                        message: String(error),
                      });
                    }
                  }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadTabs}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
