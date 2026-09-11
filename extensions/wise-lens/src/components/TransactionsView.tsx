import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { ActivityListItem } from "./ActivityListItem";
import { renderLoadErrorList } from "./LoadErrorList";
import { classifyDirection } from "../lib/classify";
import { formatDayHeader } from "../lib/format";
import { WiseActivity } from "../lib/types";
import { useDashboard } from "../lib/useDashboard";

type Filter = "all" | "in" | "out" | "completed" | "month";

export function TransactionsView() {
  const { data, isLoading, revalidate, error, prefs } = useDashboard();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return data.activities.filter((a) => {
      switch (filter) {
        case "in":
          return classifyDirection(a) === "in";
        case "out":
          return classifyDirection(a) === "out";
        case "completed":
          return a.status === "COMPLETED";
        case "month":
          return new Date(a.createdOn) >= monthStart;
        default:
          return true;
      }
    });
  }, [data, filter]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const loadError = renderLoadErrorList(isLoading, data, error, revalidate);
  if (loadError) return loadError;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by description, amount, type…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(v) => setFilter(v as Filter)}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="Incoming" value="in" icon={Icon.ArrowDown} />
          <List.Dropdown.Item title="Outgoing" value="out" icon={Icon.ArrowUp} />
          <List.Dropdown.Item title="Completed only" value="completed" icon={Icon.CheckCircle} />
          <List.Dropdown.Item title="This month" value="month" icon={Icon.Calendar} />
        </List.Dropdown>
      }
    >
      {data?.stale && (
        <List.Section title="Notice">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
            title="Cached data"
            actions={
              <ActionPanel>
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {groups.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.Receipt} title="No transactions for this filter" />
      )}

      {groups.map((g) => (
        <List.Section key={g.header} title={g.header} subtitle={`${g.items.length}`}>
          {g.items.map((a, i) => (
            <ActivityListItem
              key={`${a.createdOn}-${i}`}
              activity={a}
              numberFormat={prefs.numberFormat}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function groupByDay(activities: WiseActivity[]): { header: string; items: WiseActivity[] }[] {
  const map = new Map<string, { header: string; items: WiseActivity[] }>();
  for (const a of activities) {
    const d = new Date(a.createdOn);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const header = formatDayHeader(a.createdOn);
    const existing = map.get(key);
    if (existing) existing.items.push(a);
    else map.set(key, { header, items: [a] });
  }
  return Array.from(map.values());
}
