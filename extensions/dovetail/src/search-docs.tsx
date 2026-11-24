import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { DocDetail } from "./components/DocDetail";
import { useSearch } from "./hooks/useSearch";
import { formatFullDate, formatRelativeDate } from "./utils/formatting";
import { endpoints } from "./api/endpoints";

export default function SearchDocs() {
  const { data, isLoading, onQueryChange, numberOfResults, pagination } = useSearch(endpoints.docs);
  const { push } = useNavigation();

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onQueryChange}
      throttle
      searchBarPlaceholder="Search for docs in any project..."
      pagination={pagination}
    >
      <List.Section title="Most relevant" subtitle={numberOfResults}>
        {data.map((item) => (
          <List.Item
            key={item.id}
            title={item.title || "Untitled doc"}
            icon={Icon.Stars}
            accessories={[
              {
                text: formatRelativeDate(item.created_at),
                tooltip: formatFullDate(item.created_at),
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Show Details" onAction={() => push(<DocDetail docId={item.id} />)} />
                <Action.OpenInBrowser
                  url={item.url ?? `https://dovetail.com/docs/${item.id}`}
                  title="Open in Dovetail"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={item.url ?? `https://dovetail.com/docs/${item.id}`}
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
