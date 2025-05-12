import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Insight } from "./types/dovetail";
import { formatRelativeDate, formatFullDate } from "./utils/formatting";
import { useSearch } from "./hooks/useSearch";
import { getInsights } from "./api/client";

export default function SearchInsights() {
  const { data, isLoading, onSearchTextChange, numberOfResults } = useSearch<Insight>(getInsights);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchTextChange}
      throttle
      searchBarPlaceholder="Search for insights in any project..."
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
