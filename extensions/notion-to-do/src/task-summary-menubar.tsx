import { MenuBarExtra, open, openExtensionPreferences, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getTodaysTasks,
  getInProgressTasks,
  getBlockedTasks,
  getOverdueTasks,
  getCompletedTodayTasks,
} from "./notionClient";

interface TaskCounts {
  todaysFocus: number;
  inProgress: number;
  blocked: number;
  overdue: number;
  completedToday: number;
  total: number;
}

async function fetchTaskSummary(): Promise<TaskCounts> {
  const [todaysFocus, inProgress, blocked, overdue, completedToday] = await Promise.all([
    getTodaysTasks(),
    getInProgressTasks(),
    getBlockedTasks(),
    getOverdueTasks(),
    getCompletedTodayTasks(),
  ]);

  const total = todaysFocus.length + overdue.length;

  return {
    todaysFocus: todaysFocus.length,
    inProgress: inProgress.length,
    blocked: blocked.length,
    overdue: overdue.length,
    completedToday: completedToday.length,
    total,
  };
}

export default function TaskSummaryMenuBar() {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchTaskSummary, [], {
    initialData: {
      todaysFocus: 0,
      inProgress: 0,
      blocked: 0,
      overdue: 0,
      completedToday: 0,
      total: 0,
    },
  });

  // Calculate completion percentage
  const completionPercentage =
    data.total + data.completedToday > 0
      ? Math.round((data.completedToday / (data.total + data.completedToday)) * 100)
      : 0;

  // Menu bar title
  const menuBarTitle = isLoading
    ? "Loading..."
    : error
      ? "⚠️"
      : `${data.completedToday}/${data.total + data.completedToday} ✓`;

  return (
    <MenuBarExtra
      icon={{ source: Icon.CheckCircle, tintColor: Color.PrimaryText }}
      title={menuBarTitle}
      tooltip="Notion Task Summary"
      isLoading={isLoading}
    >
      {error ? (
        <>
          <MenuBarExtra.Item title="Failed to load tasks" icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} />
          <MenuBarExtra.Item
            title={error.message || "Unknown error"}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          />
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Open Settings"
            icon={Icon.Gear}
            onAction={async () => await openExtensionPreferences()}
          />
          <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </>
      ) : (
        <>
          <MenuBarExtra.Section title="📊 Today's Summary">
            <MenuBarExtra.Item
              title={`Progress: ${completionPercentage}% (${data.completedToday}/${data.total + data.completedToday} completed)`}
              icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={`Today's Focus: ${data.todaysFocus}`}
              subtitle="Tasks due or planned today"
              icon={{ source: Icon.Target, tintColor: Color.Blue }}
              onAction={async () => {
                await open("raycast://extensions/iroshandezilva/notion-to-do/daily-overview");
              }}
            />
            <MenuBarExtra.Item
              title={`In Progress: ${data.inProgress}`}
              subtitle="Currently active"
              icon={{ source: Icon.Circle, tintColor: Color.Blue }}
              onAction={async () => {
                await open("raycast://extensions/iroshandezilva/notion-to-do/daily-overview");
              }}
            />
            {data.blocked > 0 && (
              <MenuBarExtra.Item
                title={`Blocked: ${data.blocked}`}
                subtitle="Waiting on dependencies"
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                onAction={async () => {
                  await open("raycast://extensions/iroshandezilva/notion-to-do/daily-overview");
                }}
              />
            )}
            {data.overdue > 0 && (
              <MenuBarExtra.Item
                title={`⚠️ Overdue: ${data.overdue}`}
                subtitle="Past due date"
                icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
                onAction={async () => {
                  await open("raycast://extensions/iroshandezilva/notion-to-do/daily-overview");
                }}
              />
            )}
            <MenuBarExtra.Item
              title={`Completed Today: ${data.completedToday}`}
              subtitle="Great job! 🎉"
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              onAction={async () => {
                await open("raycast://extensions/iroshandezilva/notion-to-do/daily-overview");
              }}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Create New Task"
              icon={{ source: Icon.Plus, tintColor: Color.Green }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={async () => {
                await open("raycast://extensions/iroshandezilva/notion-to-do/create-task");
              }}
            />
            <MenuBarExtra.Item
              title="View Daily Overview"
              icon={{ source: Icon.List, tintColor: Color.Blue }}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => {
                await open("raycast://extensions/iroshandezilva/notion-to-do/daily-overview");
              }}
            />
            <MenuBarExtra.Item
              title="Search Tasks"
              icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Purple }}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                await open("raycast://extensions/iroshandezilva/notion-to-do/search-tasks");
              }}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <MenuBarExtra.Item
              title="Settings"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={async () => await openExtensionPreferences()}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
