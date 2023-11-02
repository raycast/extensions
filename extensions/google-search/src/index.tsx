import { ActionPanel, closeMainWindow, Action, Icon, List, open, Keyboard, getPreferenceValues } from "@raycast/api";
import { getIcon } from "./utils/resultUtils";
import { useSearch } from "./utils/useSearch";

export default function Command() {
  const { isLoading, results, search, addHistory, deleteAllHistory, deleteHistoryItem } = useSearch();
  const preferences = getPreferenceValues<Preferences>();

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search Google or enter a URL...">
      <List.Section title="Results" subtitle={results.length.toString()}>
        {results.map((item) => (
          <List.Item
            key={item.id}
            title={item.query}
            subtitle={preferences.showSearchDescription ? item.description : undefined}
            icon={getIcon(item)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Result">
                  <Action
                    title="Open in Browser"
                    onAction={async () => {
                      await addHistory(item);
                      await open(item.url);
                      await closeMainWindow();
                    }}
                    icon={{ source: Icon.ArrowRight }}
                  />

                  <Action.CopyToClipboard title="Copy URL to Clipboard" content={item.url} />
                  <Action.CopyToClipboard title="Copy Suggestion to Clipboard" content={item.query} />
                </ActionPanel.Section>

                <ActionPanel.Section title="History">
                  {item.isHistory && (
                    <Action
                      title="Remove From History"
                      onAction={async () => {
                        await deleteHistoryItem(item);
                      }}
                      icon={{ source: Icon.Trash }}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    />
                  )}

                  <Action
                    title="Clear All History"
                    onAction={async () => {
                      await deleteAllHistory();
                    }}
                    icon={{ source: Icon.ExclamationMark }}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
