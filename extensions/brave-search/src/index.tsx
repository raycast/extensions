import { ActionPanel, closeMainWindow, Action, Icon, List, open } from "@raycast/api";
import { useSearch } from "./app/search-service";
import { getIcon } from "./app/result-service";

export default function Command() {
  const { isLoading, results, search, addHistory, deleteAllHistory, deleteHistoryItem } = useSearch();

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search Brave or enter a URL...">
      <List.Section title="Results" subtitle={results.length + ""}>
        {results.map((item) => (
          <List.Item
            key={item.id}
            title={item.query}
            subtitle={item.description}
            icon={getIcon(item)}
            actions={
              <ActionPanel>
                <Action
                  title="Open"
                  onAction={async () => {
                    await addHistory(item);
                    await open(item.url);
                    await closeMainWindow();
                  }}
                  icon={{ source: Icon.ArrowRight }}
                />
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
                <ActionPanel.Section title="Open In">
                  <Action
                    title="Open in Safari"
                    onAction={async () => {
                      await addHistory(item);
                      await open(item.url, "com.apple.Safari");
                      await closeMainWindow();
                    }}
                    icon={{ source: Icon.ArrowRight }}
                    shortcut={{ modifiers: ["cmd"], key: "1" }}
                  />
                  <Action
                    title="Open in Brave"
                    onAction={async () => {
                      await addHistory(item);
                      await open(item.url, "com.brave.Browser");
                      await closeMainWindow();
                    }}
                    icon={{ source: Icon.ArrowRight }}
                    shortcut={{ modifiers: ["cmd"], key: "2" }}
                  />
                  <Action
                    title="Open in Chrome"
                    onAction={async () => {
                      await addHistory(item);
                      await open(item.url, "com.google.Chrome");
                      await closeMainWindow();
                    }}
                    icon={{ source: Icon.ArrowRight }}
                    shortcut={{ modifiers: ["cmd"], key: "3" }}
                  />
                  <Action
                    title="Open in Firefox"
                    onAction={async () => {
                      await addHistory(item);
                      await open(item.url, "org.mozilla.firefox");
                      await closeMainWindow();
                    }}
                    icon={{ source: Icon.ArrowRight }}
                    shortcut={{ modifiers: ["cmd"], key: "4" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Result">
                  <Action.CopyToClipboard title="Copy URL to Clipboard" content={item.url} />
                  <Action.CopyToClipboard title="Copy Suggestion to Clipboard" content={item.query} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
