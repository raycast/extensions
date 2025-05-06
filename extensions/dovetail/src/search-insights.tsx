import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useInsightsSearch } from "./hooks/useInsightsSearch";
import { Insight } from "./types/dovetail";
import { format, differenceInDays, parseISO } from "date-fns";

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const days = differenceInDays(now, date);
  if (days < 1) return "1d";
  if (days < 7) return `${days + 1}d`;
  return format(date, "MMM d");
}
function formatFullDate(dateString: string) {
  const date = new Date(dateString);
  return `Created: ${format(date, "EEEE d MMMM yyyy 'at' HH:mm")}`;
}

export default function SearchInsights() {
  const { data, isLoading, onSearchTextChange, numberOfResults } = useInsightsSearch();
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchTextChange}
      throttle
      searchBarPlaceholder="Search for insights in any project..."
    >
      <List.Section title="Most relevant" subtitle={numberOfResults}>
        {data.map((item: Insight) => (
          <List.Item
            key={item.id}
            title={item.title || "Untitled insight" }
            subtitle={!item.published ? "Draft" : ""}
            icon={Icon.Stars}
            accessories={[{ 
              text: formatRelativeDate(item.created_at),
              tooltip: formatFullDate(item.created_at)
            }]}
            actions=
              <ActionPanel>
                <Action.OpenInBrowser url={`https://dovetail.com/insights/${item.id}`} title="Open in Dovetail" />
              </ActionPanel>
          />
        ))}
      </List.Section>
    </List>
  );
} 