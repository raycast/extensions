import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useSearch } from "./hooks/useSearch";
import { formatFullDate, formatRelativeDate } from "./utils/formatting";
import { endpoints } from "./api/endpoints";

export default function SearchInsights() {
  const { data, isLoading, onQueryChange, numberOfResults, pagination } = useSearch(endpoints.insights);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onQueryChange}
      throttle
      searchBarPlaceholder="Search for insights in any project..."
      pagination={pagination}
    >
      <List.Section title="Most relevant" subtitle={numberOfResults}>
        {data.map((item) => (
          <List.Item
            key={item.id}
            title={item.title || "Untitled insight"}
            subtitle={!item.published ? "Draft" : ""}
            icon={Icon.Stars}
            accessories={[
              {
                text: formatRelativeDate(item.created_at),
                tooltip: formatFullDate(item.created_at),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://dovetail.com/insights/${item.id}`} title="Open in Dovetail" />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
