import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getUsageStats } from "./lib/usageStatsManager";

type SortOrder = "most-used" | "least-used" | "alphabetical";

export default function Command() {
  const { data: stats = {}, isLoading } = useCachedPromise(async () => getUsageStats());
  const [sortOrder, setSortOrder] = useState<SortOrder>("most-used");

  const sortedEntries = Object.entries(stats).sort(([keyA, countA], [keyB, countB]) => {
    switch (sortOrder) {
      case "most-used":
        return countB - countA;
      case "least-used":
        return countA - countB;
      case "alphabetical":
        return keyA.localeCompare(keyB);
      default:
        return 0;
    }
  });

  const totalUses = Object.values(stats).reduce((sum, count) => sum + count, 0);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search aliases... (${totalUses} total uses)`}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort Order" value={sortOrder} onChange={(v) => setSortOrder(v as SortOrder)}>
          <List.Dropdown.Item title="Most Used" value="most-used" />
          <List.Dropdown.Item title="Least Used" value="least-used" />
          <List.Dropdown.Item title="Alphabetical" value="alphabetical" />
        </List.Dropdown>
      }
    >
      {sortedEntries.length === 0 ? (
        <List.EmptyView
          icon={Icon.BarChart}
          title="No Usage Data Yet"
          description="Start using aliases to see statistics here"
        />
      ) : (
        sortedEntries.map(([alias, count]) => (
          <List.Item
            key={alias}
            title={alias}
            subtitle={`${count} ${count === 1 ? "use" : "uses"}`}
            icon={Icon.Terminal}
            accessories={[{ text: `${count}`, icon: Icon.Hashtag }]}
          />
        ))
      )}
    </List>
  );
}
