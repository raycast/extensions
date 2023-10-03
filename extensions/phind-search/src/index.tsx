import { ActionPanel, closeMainWindow, Action, Icon, List, open, useNavigation } from "@raycast/api";
import { getIcon } from "./utils/resultUtils";
import { useSearch } from "./utils/useSearch";
import Context from "./context";

export default function Command() {
  const { isLoading, results, search, addHistory, deleteAllHistory, deleteHistoryItem } = useSearch();
  const { push } = useNavigation();

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={search}
      throttle
      searchBarPlaceholder="Search Phind or enter a URL..."
    >
      <List.Section title="Results" subtitle={results.length + ""}>
        {results.map((item) => (
          <List.Item
            key={item.id}
            title={item.query}
            subtitle={item.description}
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

                  <Action.CopyToClipboard
                    title="Copy URL to Clipboard"
                    content={item.url}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Suggestion to Clipboard"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                    content={item.query}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Context">
                  <Action
                    title="Add Extra Code or Context"
                    onAction={async () => {
                      push(<Context />);
                    }}
                    icon={{ source: Icon.CodeBlock }}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="History">
                  {item.isHistory && (
                    <Action
                      title="Remove from History"
                      onAction={async () => {
                        await deleteHistoryItem(item);
                      }}
                      icon={{ source: Icon.Trash }}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    />
                  )}

                  <Action
                    title="Clear All History"
                    onAction={async () => {
                      await deleteAllHistory();
                    }}
                    style={Action.Style.Destructive}
                    icon={{ source: Icon.ExclamationMark }}
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
