import {
  ActionPanel,
  closeMainWindow,
  CopyToClipboardAction,
  Icon,
  List,
} from "@raycast/api";
import { getIcon } from "./utils/resultUtils";
import { useSearch } from "./utils/useSearch";
import open from "open";
import { SearchResult } from "./utils/types";

export default function Command() {
  const {
    isLoading,
    history,
    results,
    searchText,
    search,
    addHistory,
    deleteAllHistory,
    deleteHistoryItem,
  } = useSearch();

  const listItems: SearchResult[] = searchText.length === 0 ? history : results;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Diki"
      throttle
    >
      <List.Section title="Results" subtitle={listItems.length + ""}>
        {listItems.map((item) => (
          <List.Item
            key={item.id}
            title={item.query}
            subtitle={item.description}
            icon={getIcon(item)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Result">
                  <ActionPanel.Item
                    title="Open in Browser"
                    onAction={async () => {
                      await addHistory(item);
                      await open(item.url);
                      await closeMainWindow();
                    }}
                    icon={{ source: Icon.ArrowRight }}
                  />

                  <CopyToClipboardAction
                    title="Copy URL to Clipboard"
                    content={item.url}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="History">
                  {item.isHistory && (
                    <ActionPanel.Item
                      title="Remove From History"
                      onAction={async () => {
                        await deleteHistoryItem(item);
                      }}
                      icon={{ source: Icon.Trash }}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                  )}

                  <ActionPanel.Item
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
