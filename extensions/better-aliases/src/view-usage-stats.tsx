import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getUsageStats } from "./lib/usageStatsManager";

type SortOrder = "most-used" | "least-used" | "alphabetical";
type TimeRange = "7d" | "30d" | "365d" | "year" | "all";

export default function Command() {
  const { data: stats = {}, isLoading } = useCachedPromise(async () => getUsageStats());
  const [sortOrder, setSortOrder] = useState<SortOrder>("most-used");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const filteredStats = useMemo(() => {
    const now = new Date();
    let startDate: string | null = null;

    if (timeRange === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      startDate = d.toISOString().split("T")[0];
    } else if (timeRange === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      startDate = d.toISOString().split("T")[0];
    } else if (timeRange === "365d") {
      const d = new Date();
      d.setDate(d.getDate() - 364);
      startDate = d.toISOString().split("T")[0];
    } else if (timeRange === "year") {
      startDate = `${now.getFullYear()}-01-01`;
    }

    const result: Record<string, number> = {};
    for (const [alias, daily] of Object.entries(stats)) {
      let count = 0;
      for (const [date, dailyCount] of Object.entries(daily)) {
        if (!startDate || date >= startDate) {
          count += dailyCount;
        }
      }
      if (count > 0) {
        result[alias] = count;
      }
    }
    return result;
  }, [stats, timeRange]);

  const sortedEntries = useMemo(() => {
    return Object.entries(filteredStats).sort(([keyA, countA], [keyB, countB]) => {
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
  }, [filteredStats, sortOrder]);

  const totalExpansions = Object.values(filteredStats).reduce((sum, count) => sum + count, 0);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search aliases... (${sortedEntries.length} aliases, ${totalExpansions} expansion${totalExpansions === 1 ? "" : "s"})`}
      searchBarAccessory={
        <List.Dropdown tooltip="Time Range" value={timeRange} onChange={(v) => setTimeRange(v as TimeRange)}>
          <List.Dropdown.Item title="All Time" value="all" />
          <List.Dropdown.Item title="Last 7 Days" value="7d" />
          <List.Dropdown.Item title="Last 30 Days" value="30d" />
          <List.Dropdown.Item title="Last 365 Days" value="365d" />
          <List.Dropdown.Item title="This Year" value="year" />
        </List.Dropdown>
      }
    >
      {sortedEntries.length === 0 ? (
        <List.EmptyView
          icon={Icon.BarChart}
          title="No Usage Data"
          description={timeRange === "all" ? "Start using aliases to see statistics here" : "No usage in this period"}
        />
      ) : (
        sortedEntries.map(([alias, count], index) => (
          <List.Item
            key={alias}
            title={alias}
            subtitle={`${count} expansion${count === 1 ? "" : "s"}`}
            icon={Icon.Terminal}
            accessories={[{ text: `${index + 1}`, icon: Icon.Hashtag }]}
            actions={
              <ActionPanel>
                <ActionPanel.Submenu title="Sort Order" icon={Icon.List}>
                  <Action
                    title="Most Used"
                    icon={sortOrder === "most-used" ? Icon.Checkmark : undefined}
                    onAction={() => setSortOrder("most-used")}
                  />
                  <Action
                    title="Least Used"
                    icon={sortOrder === "least-used" ? Icon.Checkmark : undefined}
                    onAction={() => setSortOrder("least-used")}
                  />
                  <Action
                    title="Alphabetical"
                    icon={sortOrder === "alphabetical" ? Icon.Checkmark : undefined}
                    onAction={() => setSortOrder("alphabetical")}
                  />
                </ActionPanel.Submenu>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
