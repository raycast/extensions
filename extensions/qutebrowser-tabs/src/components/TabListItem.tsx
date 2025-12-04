import { List, ActionPanel, Action, Clipboard, showToast, Toast, closeMainWindow, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { Tab } from "../types";
import { sanitizeCommandString } from "../utils/common/stringUtils";

interface TabListItemProps {
  tab: Tab;
  onFocus: (tab: Tab) => Promise<boolean>;
  refreshTabs: () => void;
}

export function TabListItem({ tab, onFocus, refreshTabs }: TabListItemProps) {
  const copyUrl = (url: string) => {
    Clipboard.copy(url);
    showToast({
      style: Toast.Style.Success,
      title: "URL copied",
    });
  };

  const openInBrowser = (url: string) => {
    try {
      const safeUrl = sanitizeCommandString(url);
      exec(`open "${safeUrl}"`, (error) => {
        if (error) {
          showFailureToast(error, {
            title: "Failed to open URL",
          });
        }
      });
    } catch (err) {
      showFailureToast(err, {
        title: "Failed to open URL",
      });
    }
  };

  const handleTabFocus = async () => {
    try {
      const success = await onFocus(tab);
      if (success) {
        await closeMainWindow();
      } else {
        showToast({
          title: "Failed to focus tab",
          style: Toast.Style.Failure,
          message: "Could not focus the selected tab in qutebrowser",
        });
      }
    } catch (err) {
      showFailureToast(err, {
        title: "Failed to focus tab",
      });
    }
  };

  return (
    <List.Item
      key={`${tab.window}-${tab.index}`}
      icon={tab.pinned ? { source: Icon.Tack } : undefined}
      title={tab.title || "Untitled"}
      subtitle={tab.url}
      accessories={
        [
          { text: `Tab ${tab.index + 1}` },
          tab.pinned ? { tag: "Pinned", color: "green" } : null,
          tab.active ? { tag: "Active", color: "blue" } : null,
        ].filter(Boolean) as {
          text?: string;
          icon?: string;
          tag?: string;
          color?: string;
          tooltip?: string;
        }[]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Tab Actions">
            <Action
              title="Open with Qutebrowser"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={handleTabFocus}
            />
            <Action
              title="Open with Default Browser"
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              onAction={() => openInBrowser(tab.url)}
            />
            <Action title="Copy URL" shortcut={{ modifiers: ["cmd"], key: "c" }} onAction={() => copyUrl(tab.url)} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Refresh">
            <Action
              title="Refresh Tabs"
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={refreshTabs}
              icon={Icon.ArrowClockwise}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
