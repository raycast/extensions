import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { DataDetail } from "./components/DataDetail";
import { endpoints } from "./api/endpoints";
import { useSearch } from "./hooks/useSearch";
import { formatFullDate, formatRelativeDate } from "./utils/formatting";

export default function SearchData() {
  const { data, isLoading, onQueryChange, numberOfResults, pagination } = useSearch(endpoints.data);
  const { push } = useNavigation();

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onQueryChange}
      throttle
      searchBarPlaceholder="Search for data in any project..."
      pagination={pagination}
    >
      <List.Section title="Most relevant" subtitle={numberOfResults}>
        {data.map((item) => (
          <List.Item
            key={item.id}
            title={item.title ?? "Untitled"}
            icon={Icon.Document}
            accessories={[{ text: formatRelativeDate(item.created_at), tooltip: formatFullDate(item.created_at) }]}
            actions={
              <ActionPanel>
                <Action title="Show Details" onAction={() => push(<DataDetail dataId={item.id} />)} />
                <Action.OpenInBrowser
                  url={item.url ?? `https://dovetail.com/data/${item.id}`}
                  title="Open in Dovetail"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={item.url ?? `https://dovetail.com/data/${item.id}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
