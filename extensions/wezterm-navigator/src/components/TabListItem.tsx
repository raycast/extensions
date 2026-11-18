import { Action, ActionPanel, closeMainWindow, confirmAlert, Alert, Icon, List, showToast, Toast } from "@raycast/api";
import { WezTermTab } from "../types";
import { getTabAccessories, getTabDisplayTitle, getTabIcon, getTabKeywords, getTabSubtitle } from "../utils/formatting";
import { activatePane, focusWezTerm, killPane, setTabTitle, switchWorkspace } from "../utils/wezterm";
import { CreateTabForm } from "../create-tab";
import { TabDetail } from "./TabDetail";
import { RenameForm } from "./RenameForm";

interface TabListItemProps {
  tab: WezTermTab;
  onTabChanged: () => void;
}

export function TabListItem({ tab, onTabChanged }: TabListItemProps) {
  async function handleSwitchTab() {
    try {
      const paneId = tab.panes[0]?.paneId;
      if (paneId == null) throw new Error("No pane found in tab");
      await switchWorkspace(tab.workspace);
      // Wait for WezTerm to switch workspace (file IPC takes ~100-200ms)
      await new Promise((resolve) => setTimeout(resolve, 200));
      await closeMainWindow({ clearRootSearch: true });
      await activatePane(paneId);
      focusWezTerm();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch tab",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleCloseTab() {
    const confirmed = await confirmAlert({
      title: "Close Tab",
      message: `Are you sure you want to close "${getTabDisplayTitle(tab)}"? This will kill all ${tab.panes.length} pane(s).`,
      primaryAction: { title: "Close Tab", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Closing tab..." });
      for (const pane of tab.panes) {
        await killPane(pane.paneId);
      }
      await showToast({ style: Toast.Style.Success, title: "Tab closed" });
      onTabChanged();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to close tab",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleRenameTab(newName: string) {
    await setTabTitle(tab.tabId, newName);
    onTabChanged();
  }

  return (
    <List.Item
      title={getTabDisplayTitle(tab)}
      subtitle={getTabSubtitle(tab)}
      icon={getTabIcon(tab)}
      accessories={getTabAccessories(tab)}
      keywords={getTabKeywords(tab)}
      detail={<TabDetail tab={tab} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            <Action title="Switch to Tab" icon={Icon.ArrowRight} onAction={handleSwitchTab} />
            <Action.Push
              title="Create Tab…"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<CreateTabForm defaultWorkspace={tab.workspace} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action.Push
              title="Rename Tab…"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
              target={<RenameForm type="Tab" currentName={tab.tabTitle} onRename={handleRenameTab} />}
            />
            <Action
              title="Close Tab"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "opt"], key: "x" }}
              onAction={handleCloseTab}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Tab Title"
              content={getTabDisplayTitle(tab)}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
