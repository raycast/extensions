import {
  MenuBarExtra,
  openCommandPreferences,
  getPreferenceValues,
  LaunchProps,
  LaunchType,
  launchCommand,
  Icon,
  Color,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { addDays, format, isBefore, isSameDay } from "date-fns";
import { useEffect, useMemo } from "react";
import removeMarkdown from "remove-markdown";

import { SyncData, Task, getProductivityStats } from "./api";
import MenuBarTask from "./components/MenubarTask";
import View from "./components/View";
import { getToday } from "./helpers/dates";
import { groupByDates } from "./helpers/groupBy";
import { getTasksForTodayOrUpcomingView } from "./helpers/tasks";
import useFilterTasks from "./hooks/useFilterData";
import { useFocusedTask } from "./hooks/useFocusedTask";
import useSyncData from "./hooks/useSyncData";

type MenuBarProps = LaunchProps<{ launchContext: { fromCommand: boolean } }>;

function MenuBar(props: MenuBarProps) {
  const launchedFromWithinCommand = props.launchContext?.fromCommand ?? false;
  // Don't perform a full sync if the command was launched from within another commands
  const { data, setData, isLoading } = useSyncData(!launchedFromWithinCommand);
  const { focusedTask, unfocusTask } = useFocusedTask();
  const { view, filter, upcomingDays, hideMenuBarCount } = getPreferenceValues<Preferences.MenuBar>();
  const { data: filterTasks, isLoading: isLoadingFilter } = useFilterTasks(view === "filter" ? filter : "");

  const tasks = useMemo(() => {
    const tasks = data ? getTasksForTodayOrUpcomingView(data.items, data.user.id) : [];

    if (view === "today") {
      return tasks.filter((t) => {
        if (!t.due) {
          return false;
        }

        return isBefore(new Date(t.due.date), getToday()) || isSameDay(new Date(t.due.date), getToday());
      });
    }

    if (upcomingDays && !isNaN(Number(upcomingDays))) {
      return tasks.filter((t) => {
        if (!t.due) {
          return false;
        }

        const dateToCompare = addDays(getToday(), Number(upcomingDays));

        return isBefore(new Date(t.due.date), dateToCompare);
      });
    }
    return data?.items.filter((t) => t.due?.date) ?? [];
  }, [data, upcomingDays, view]);

  useEffect(() => {
    const isFocusedTaskInTasks = data?.items?.some((t) => t.id === focusedTask.id);

    if (!isFocusedTaskInTasks) {
      unfocusTask();
    }
  }, [focusedTask, unfocusTask, data, filter]);

  const menuBarExtraTitle = useMemo(() => {
    if (focusedTask.id) {
      return removeMarkdown(focusedTask.content);
    }

    if (hideMenuBarCount) {
      return "";
    }

    if (tasks && view !== "filter") {
      return tasks.length > 0 ? tasks.length.toString() : "🎉";
    } else if (filterTasks) {
      return filterTasks.length > 0 ? filterTasks.length.toString() : "🎉";
    }
  }, [focusedTask, tasks, hideMenuBarCount, filterTasks, view]);

  let taskView = tasks && <UpcomingView tasks={tasks} data={data} setData={setData} />;
  if (view === "today") {
    taskView = tasks && <TodayView tasks={tasks} data={data} setData={setData} />;
  } else if (view === "filter") {
    taskView = <FilterView tasks={filterTasks || []} data={data} setData={setData} />;
  }

  return (
    <MenuBarExtra
      icon={{
        source: { light: "icon.png", dark: "icon@dark.png" },
        tintColor: {
          light: "",
          dark: "#E5E5E5",
          adjustContrast: false,
        },
      }}
      isLoading={isLoading || isLoadingFilter}
      title={menuBarExtraTitle}
    >
      {taskView}

      <MenuBarExtra.Section>
        {focusedTask.id !== "" && (
          <MenuBarExtra.Item icon={Icon.MinusCircle} title="Unfocus the current task" onAction={unfocusTask} />
        )}

        <MenuBarExtra.Item
          title="Inbox"
          icon={{ source: Icon.Tray, tintColor: Color.Blue }}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          onAction={() => launchCommand({ name: "home", type: LaunchType.UserInitiated, context: { view: "inbox" } })}
        />

        <MenuBarExtra.Item
          title="Today"
          icon={{ source: Icon.Calendar, tintColor: Color.Green }}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => launchCommand({ name: "home", type: LaunchType.UserInitiated, context: { view: "today" } })}
        />

        <MenuBarExtra.Item
          title="Upcoming"
          icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
          onAction={() =>
            launchCommand({ name: "home", type: LaunchType.UserInitiated, context: { view: "upcoming" } })
          }
        />

        <MenuBarExtra.Item
          title="Completed Tasks"
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={() =>
            launchCommand({ name: "home", type: LaunchType.UserInitiated, context: { view: "completed" } })
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Create Task"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => launchCommand({ name: "create-task", type: LaunchType.UserInitiated })}
        />

        <MenuBarExtra.Item
          title="Create Project"
          icon={Icon.PlusCircle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          onAction={() => launchCommand({ name: "create-project", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

type TaskViewProps = {
  tasks: Task[];
  data?: SyncData;
  setData: React.Dispatch<React.SetStateAction<SyncData | undefined>>;
};

const TodayView = ({ tasks, data, setData }: TaskViewProps) => {
  const { data: stats } = useCachedPromise(() => getProductivityStats());

  const todayStats = stats?.days_items.find((d) => d.date === format(Date.now(), "yyyy-MM-dd"));
  const completedToday = todayStats?.total_completed ?? 0;

  const sections = useMemo(() => {
    return groupByDates(tasks);
  }, [tasks]);

  if (tasks.length > 0) {
    return (
      <>
        {sections.map((section, index) => {
          return (
            <MenuBarExtra.Section title={section.name} key={index}>
              {section.tasks.map((task) => (
                <MenuBarTask key={task.id} task={task} data={data} setData={setData} />
              ))}
            </MenuBarExtra.Section>
          );
        })}
      </>
    );
  }

  if (completedToday > 0) {
    return (
      <MenuBarExtra.Item
        title={`Congrats! You've completed ${completedToday} ${completedToday === 1 ? "task" : "tasks"} today.`}
        icon="🎉"
      />
    );
  } else {
    return <MenuBarExtra.Item title="No tasks due today." />;
  }
};

const FilterView = ({ tasks, data, setData }: TaskViewProps) => {
  const sections = useMemo(() => {
    return groupByDates(tasks);
  }, [tasks]);

  if (tasks.length > 0) {
    return (
      <MenuBarExtra.Section title={"Filtered tasks"}>
        {sections.map((section, index) => {
          return (
            <MenuBarExtra.Section title={section.name} key={index}>
              {section.tasks.map((task) => (
                <MenuBarTask key={task.id} task={task} data={data} setData={setData} />
              ))}
            </MenuBarExtra.Section>
          );
        })}
      </MenuBarExtra.Section>
    );
  }

  return <MenuBarExtra.Item title="No tasks matching filter." />;
};

const UpcomingView = ({ tasks, data, setData }: TaskViewProps): JSX.Element => {
  const { upcomingDays } = getPreferenceValues<Preferences.MenuBar>();
  const isUpcomingDaysView = upcomingDays !== "" && !isNaN(Number(upcomingDays));

  const sections = useMemo(() => {
    return groupByDates(tasks);
  }, [tasks]);

  return tasks.length > 0 ? (
    <>
      <MenuBarExtra.Item
        title={isUpcomingDaysView ? `Tasks due before the next ${upcomingDays} days` : "All upcoming tasks"}
      />

      {sections.map((section, index) => {
        return (
          <MenuBarExtra.Section title={section.name} key={index}>
            {section.tasks.map((task) => (
              <MenuBarTask key={task.id} task={task} data={data} setData={setData} />
            ))}
          </MenuBarExtra.Section>
        );
      })}
    </>
  ) : (
    <MenuBarExtra.Item title="No upcoming tasks." />
  );
};

export default function Command(props: MenuBarProps) {
  return (
    <View>
      <MenuBar {...props} />
    </View>
  );
}
