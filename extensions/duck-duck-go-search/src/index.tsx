import { Action, ActionPanel, Alert, Icon, List, closeMainWindow, confirmAlert, open } from "@raycast/api";
import { useSearch } from "./utils/useSearch";

export default function Command() {
  const { isLoading, results, search, addHistory, deleteAllHistory, deleteHistoryItem } = useSearch();

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search DuckDuckGo...">
      <List.Section title="Results" subtitle={results.length + ""}>
        {results.map((item) => (
          <List.Item
            key={item.id}
            title={item.query}
            icon={item.isHistory ? Icon.Clock : Icon.MagnifyingGlass}
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
                      title="Remove from History"
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        await deleteHistoryItem(item);
                      }}
                      icon={{ source: Icon.Trash }}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    />
                  )}

                  <Action
                    title="Clear All History"
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const options: Alert.Options = {
                        title: "Clear DuckDuckGo search history?",
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                          onAction: async () => {
                            await deleteAllHistory();
                          },
                        },
                      };

                      await confirmAlert(options);
                    }}
                    icon={{ source: Icon.Trash }}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
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
