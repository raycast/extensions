import { Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { HubListItem } from "./components/hub-ui";
import { hubTrendingURL, type HubListResponse } from "./lib/hub-api";

export default function Command() {
  const { data, isLoading } = useFetch<HubListResponse>(hubTrendingURL(30), { keepPreviousData: true });
  const items = data?.data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter trending snippets…">
      <List.EmptyView icon={Icon.LineChart} title={isLoading ? "Loading trending snippets…" : "No trending snippets"} />
      {items.map((snippet) => (
        <HubListItem key={snippet.id} snippet={snippet} />
      ))}
    </List>
  );
}
