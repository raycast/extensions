import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useMemo } from "react";

import { View } from "./components/View";
import { OpenInTimAction } from "./components/actions/OpenInTimAction";
import { StartTaskAction } from "./components/actions/StartTaskAction";
import { groupBy, sortBy } from "./helpers/array";
import { RecordPerDay, getHours, getMinutes, groupRecordsPerDay } from "./helpers/tim";
import { useCurrencyFormatter } from "./hooks/useCurrencyFormatter";
import { useDateFormatter } from "./hooks/useDateFormatter";
import { useDurationFormatter } from "./hooks/useDurationFormatter";
import { useData } from "./state/data";
import { Group, TimColor } from "./types/tim";

dayjs.extend(isoWeek);

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

  function getFilterDate(filter?: Filter) {
    if (filter === "year") return dayjs().startOf("year");
    if (filter === "month") return dayjs().startOf("month");
    if (filter === "week") return dayjs().startOf("isoWeek");
    return dayjs(0);
  }

  const tasksPerDay = useMemo(() => {
    if (!data) return [];
    const filterDate = getFilterDate(filter);

    const days = Object.keys(data.tasks).flatMap((id) =>
      groupRecordsPerDay(data.tasks[id].records, getRate(id))
        .filter(({ date }) => filter === "all" || filterDate.isBefore(date) || filterDate.isSame(date))
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
                actions={<TaskActions {...task} title={data.tasks[task.id].title} />}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
};

function TaskActions(task: RecordPerDay & { title: string; id: string }) {
  const actions = [
    {
      title: "Title",
      content: task.title,
      shortcutKey: "t",
    },
    {
      title: "Notes",
      content: task.notes,
      shortcutKey: "n",
    },
    {
      title: "Hours",
      content: getHours(task.totalTime),
      shortcutKey: "h",
    },
    {
      title: "Minutes",
      content: getMinutes(task.totalTime),
      shortcutKey: "m",
    },
  ] as const;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <StartTaskAction task={task} />
        <OpenInTimAction id={task.id} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {actions.map((action) => (
          <Action.Paste
            key={action.shortcutKey}
            title={`Paste ${action.title}`}
            shortcut={{ modifiers: ["cmd"], key: action.shortcutKey }}
            content={action.content}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {actions.map((action) => (
          <Action.CopyToClipboard
            key={action.shortcutKey}
            title={`Copy ${action.title}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: action.shortcutKey }}
            content={action.content}
          />
        ))}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  return (
    <View>
      <DailyOverview />
    </View>
  );
}
