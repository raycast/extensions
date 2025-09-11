import { List, Action, ActionPanel, Icon, closeMainWindow } from "@raycast/api";
import { CometHistoryEntry } from "../lib/types";
import { cometBrowser } from "../lib/comet";
import { formatUrl, formatTimestamp, copyToClipboard, copyAsMarkdown, handleError, getTabIcon } from "../lib/utils";

interface HistoryListItemProps {
  entry: CometHistoryEntry;
}

export function HistoryListItem({ entry }: HistoryListItemProps) {
  const subtitle = formatUrl(entry.url);
  const icon = getTabIcon(entry.url);
  const lastVisit = formatTimestamp(entry.last_visit_time);

  async function openUrl() {
    try {
      await cometBrowser.openUrl(entry.url);
      await closeMainWindow();
    } catch (error) {
      await handleError(error, "opening URL");
    }
  }

  async function openInNewTab() {
    try {
      await cometBrowser.openInNewTab(entry.url);
      await closeMainWindow();
    } catch (error) {
      await handleError(error, "opening in new tab");
    }
  }

  return (
    <List.Item
      id={entry.id.toString()}
      title={entry.title || "Untitled"}
      subtitle={subtitle}
      icon={icon}
      accessories={[
        { text: lastVisit },
        ...(entry.visit_count > 1
          ? [
              {
                text: `${entry.visit_count} visits`,
                tooltip: `Visited ${entry.visit_count} times`,
              },
            ]
          : []),
        { text: "History" },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            <Action
              title="Open in Current Tab"
              icon={Icon.ArrowRight}
              onAction={openUrl}
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
              onAction={async () => await copyToClipboard(entry.url, "URL")}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Copy Title"
              icon={Icon.Text}
              onAction={async () => await copyToClipboard(entry.title || "Untitled", "Title")}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            <Action
              title="Copy as Markdown"
              icon={Icon.Document}
              onAction={async () => await copyAsMarkdown(entry.title || "Untitled", entry.url)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
