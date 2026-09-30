import { ActionPanel, closeMainWindow, Action, Icon, List, open } from "@raycast/api";
import { getIcon } from "./naver/resultUtils";
import { useSearch } from "./naver/useSearch";

export default function Command() {
  const { isLoading, results, search, addHistory, deleteAllHistory, deleteHistoryItem } = useSearch("KOKO");

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search Naver or enter a URL...">
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
                  <Action.CopyToClipboard title="Copy Suggestion to Clipboard" content={item.query} />
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
                </ActionPanel.Section>

                <ActionPanel.Section title="History">
                  {item.isHistory && (
                    <Action
                      title="Remove From History"
                      onAction={async () => {
                        await deleteHistoryItem(item);
                      }}
                      icon={{ source: Icon.Trash }}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                  )}

                  <Action
                    title="Clear All History"
                    onAction={async () => {
                      await deleteAllHistory();
                    }}
                    icon={{ source: Icon.ExclamationMark }}
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
