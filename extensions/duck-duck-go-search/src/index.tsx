import { ActionPanel, closeMainWindow, Action, Icon, List, open } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useSearch } from "./utils/useSearch";

export default function Command() {
  const { isLoading, results, search, addHistory, deleteAllHistory, deleteHistoryItem } = useSearch();

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search DuckDuckGo or enter a URL...">
      <List.Section title="Results" subtitle={results.length + ""}>
        {results.map((item) => (
          <List.Item
            key={item.id}
            title={item.query}
            subtitle={item.description}
            icon={
              item.url.split("/")[2] === "duckduckgo.com"
                ? { source: Icon.MagnifyingGlass }
                : getFavicon("https://" + item.url.split("/")[2])
            }
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
