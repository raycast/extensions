import { List, Action, ActionPanel, Icon, closeMainWindow } from "@raycast/api";
import { CometTab } from "../lib/types";
import { cometBrowser } from "../lib/comet";
import { formatUrl, copyToClipboard, copyAsMarkdown, handleError, getTabIcon } from "../lib/utils";

interface TabListItemProps {
  tab: CometTab;
  onRefresh?: () => void;
}

export function TabListItem({ tab, onRefresh }: TabListItemProps) {
  const subtitle = formatUrl(tab.url);
  const icon = getTabIcon(tab.url);

  async function switchToTab() {
    try {
      await cometBrowser.switchToTab(tab.id);
      await closeMainWindow();
      onRefresh?.();
    } catch (error) {
      await handleError(error, "switching to tab");
    }
  }

  async function openInNewTab() {
    try {
      await cometBrowser.openInNewTab(tab.url);
      await closeMainWindow();
    } catch (error) {
      await handleError(error, "opening in new tab");
    }
  }

  return (
    <List.Item
      id={tab.id}
      title={tab.title || "Untitled"}
      subtitle={subtitle}
      icon={icon}
      accessories={[...(tab.loading ? [{ icon: Icon.Clock, tooltip: "Loading..." }] : []), { text: "Tab" }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            <Action
              title="Switch to Tab"
              icon={Icon.ArrowRight}
              onAction={switchToTab}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            <Action
              title="Open in New Tab"
              icon={Icon.Plus}
              onAction={openInNewTab}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action
              title="Copy URL"
              icon={Icon.Link}
              onAction={async () => await copyToClipboard(tab.url, "URL")}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Copy Title"
              icon={Icon.Text}
              onAction={async () => await copyToClipboard(tab.title || "Untitled", "Title")}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            <Action
              title="Copy as Markdown"
              icon={Icon.Document}
              onAction={async () => await copyAsMarkdown(tab.title || "Untitled", tab.url)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Refresh">
            <Action
              title="Refresh List"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
