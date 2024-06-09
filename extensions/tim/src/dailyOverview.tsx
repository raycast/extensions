import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import dayjs from "dayjs";
import { useMemo } from "react";

import { View } from "./components/View";
import { groupBy, sortBy } from "./helpers/array";
import { getHours, getMinutes, groupRecordsPerDay } from "./helpers/tim";
import { useCurrencyFormatter } from "./hooks/useCurrencyFormatter";
import { useDateFormatter } from "./hooks/useDateFormatter";
import { useDurationFormatter } from "./hooks/useDurationFormatter";
import { useData } from "./state/data";
import { Group, TimColor } from "./types/tim";

const filterItems = [
  {
    value: "week",
    title: "This week",
  },
  {
    value: "month",
    title: "This month",
  },
  {
    value: "year",
    title: "This year",
  },
  {
    value: "all",
    title: "All",
  },
] as const;
type Filter = (typeof filterItems)[number]["value"];

const DailyOverview = () => {
  const { data, isLoading } = useData();
  const [filter, setFilter] = useCachedState<Filter | undefined>("filter", "week");

  const dateFormatter = useDateFormatter();
  const durationFormatter = useDurationFormatter();
  const currencyFormatter = useCurrencyFormatter();

  const taskIdToGroup =
    data?.nodes.reduce(
      (map, node) => ({ ...map, [node.id]: node.parent ? data.groups[node.parent] : undefined }),
      {} as Record<string, Group | undefined>,
    ) ?? {};

  const getRate = (taskId: string) => data?.tasks[taskId].rate || taskIdToGroup[taskId]?.rate;

  const tasksPerDay = useMemo(() => {
    if (!data) return [];
    const filterDate =
      filter === "week" ? dayjs().day(1) : filter === "month" ? dayjs().date(1) : dayjs().month(0).date(1);

    const days = Object.keys(data.tasks).flatMap((id) =>
      groupRecordsPerDay(data.tasks[id].records, getRate(id))
        .filter(({ date }) => filter === "all" || filterDate.isBefore(date))
        .map((record) => ({ id, ...record })),
    );

    return sortBy(
      Object.entries(groupBy(days, "date")).map(([date, tasks]) => ({ date, tasks: sortBy(tasks, "id") })),
      "date",
      "desc",
    );
  }, [data, filter]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Time" value={filter} onChange={(value) => setFilter(value as Filter)}>
          {filterItems.map((item) => (
            <List.Dropdown.Item title={item.title} value={item.value} key={item.value} />
          ))}
        </List.Dropdown>
      }
    >
      {data &&
        tasksPerDay.map((day) => (
          <List.Section
            key={day.date}
            title={dateFormatter.format(new Date(day.date))}
            subtitle={durationFormatter.format(day.tasks.reduce((sum, task) => sum + task.totalTime, 0))}
          >
            {day.tasks.map((task) => (
              <List.Item
                key={task.id}
                title={data.tasks[task.id].title}
                subtitle={task.notes}
                keywords={[task.notes, dateFormatter.format(new Date(day.date))]}
                accessories={[
                  ...(data.tasks[task.id].tags ?? []).map(
                    (id): List.Item.Accessory => ({
                      tag: {
                        value: data.tags[id].title,
                        color: data.tags[id].color,
                      },
                    }),
                  ),
                  {
                    text: task.value > 0 ? currencyFormatter.format(task.value) : undefined,
                    tooltip: "Value",
                  },
                  {
                    text: durationFormatter.format(task.totalTime),
                    tooltip: "Total Time",
                  },
                  {
                    icon: {
                      source: Icon.Dot,
                      tintColor: TimColor[data.tasks[task.id].color] ?? data.tasks[task.id].color,
                    },
                    tooltip: taskIdToGroup[task.id]?.title,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Paste
                        title="Paste Task Title"
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        content={data.tasks[task.id].title}
                      />
                      <Action.Paste
                        title="Paste Task Notes"
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        content={task.notes}
                      />
                      <Action.Paste
                        title="Paste Task Hours"
                        shortcut={{ modifiers: ["cmd"], key: "h" }}
                        content={getHours(task.totalTime)}
                      />
                      <Action.Paste
                        title="Paste Task Minutes"
                        shortcut={{ modifiers: ["cmd"], key: "m" }}
                        content={getMinutes(task.totalTime)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
};

export default function Command() {
  return (
    <View>
      <DailyOverview />
    </View>
  );
}
