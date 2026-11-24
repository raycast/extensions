import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { HistoryListItem } from "./history-item";
import { getHistory } from "./yab";

export default function Command() {
  const { data = [], isLoading } = useCachedPromise(async () => getHistory());
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search history">
      {data.map((h) => (
        <HistoryListItem key={h.url} item={h} />
      ))}
    </List>
  );
}
