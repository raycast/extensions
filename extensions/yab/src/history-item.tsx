import { ActionPanel, List } from "@raycast/api";
import { UrlActions } from "./actions";
import { faviconFor, HistoryItem } from "./yab";

export function HistoryListItem({ item }: { item: HistoryItem }) {
  return (
    <List.Item
      title={item.title || item.url}
      subtitle={item.title ? item.url : undefined}
      icon={faviconFor(item.url)}
      keywords={[item.url]}
      accessories={[{ date: item.lastVisit, tooltip: `${item.count} visit${item.count === 1 ? "" : "s"}` }]}
      actions={
        <ActionPanel>
          <UrlActions url={item.url} title={item.title} />
        </ActionPanel>
      }
    />
  );
}
