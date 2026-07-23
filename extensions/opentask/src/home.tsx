import { Icon, LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getCompletedTasks } from "./api";
import TaskListItem from "./components/TaskListItem";
import TaskListSections from "./components/TaskListSections";
import { todayIn } from "./helpers/dates";
import { getInboxTasks, groupTodayTasks, groupUpcomingTasks } from "./helpers/groupBy";
import { useOpenTasks, useProjects, useUserSettings } from "./hooks/useData";

type View = "today" | "upcoming" | "inbox" | "completed";

const emptyStates: Record<View, { title: string; description: string }> = {
  today: { title: "All clear for today!", description: "No tasks due today. Enjoy the calm." },
  upcoming: { title: "Nothing upcoming", description: "No tasks are scheduled for the days ahead." },
  inbox: { title: "Inbox zero", description: "Your inbox has no open tasks." },
  completed: { title: "No completed tasks", description: "Tasks you complete will show up here." },
};

export default function Home(props: LaunchProps<{ launchContext?: { view?: View } }>) {
  const preferences = getPreferenceValues<Preferences.Home>();
  const [view, setView] = useState<View>(props.launchContext?.view ?? (preferences.view as View) ?? "today");

  const { data: tasks, isLoading, mutate } = useOpenTasks();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();
  const {
    data: completedTasks,
    isLoading: isLoadingCompleted,
    mutate: mutateCompleted,
  } = useCachedPromise(getCompletedTasks, [], { execute: view === "completed", keepPreviousData: true });

  const today = todayIn(settings?.timezone);
  const timeFormat = settings?.timeFormat;
  const inboxProjectId = projects?.find((project) => project.is_inbox)?.id;

  const empty = emptyStates[view];

  return (
    <List
      isLoading={view === "completed" ? isLoadingCompleted : isLoading}
      searchBarPlaceholder="Filter tasks"
      searchBarAccessory={
        <List.Dropdown tooltip="Select view" value={view} onChange={(newValue) => setView(newValue as View)}>
          <List.Dropdown.Item title="Today" value="today" icon={Icon.Calendar} />
          <List.Dropdown.Item title="Upcoming" value="upcoming" icon={Icon.ArrowRight} />
          <List.Dropdown.Item title="Inbox" value="inbox" icon={Icon.Tray} />
          <List.Dropdown.Item title="Completed" value="completed" icon={Icon.CheckCircle} />
        </List.Dropdown>
      }
    >
      {view === "today" && tasks ? (
        <TaskListSections
          sections={groupTodayTasks(tasks, today).filter((section) => section.tasks.length > 0)}
          today={today}
          mutate={mutate}
          projects={projects}
          timeFormat={timeFormat}
        />
      ) : null}
      {view === "upcoming" && tasks ? (
        <TaskListSections
          sections={groupUpcomingTasks(tasks, today)}
          today={today}
          mutate={mutate}
          projects={projects}
          timeFormat={timeFormat}
        />
      ) : null}
      {view === "inbox"
        ? getInboxTasks(tasks ?? [], inboxProjectId).map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              today={today}
              mutate={mutate}
              projects={projects}
              showProject={false}
              timeFormat={timeFormat}
            />
          ))
        : null}
      {view === "completed"
        ? completedTasks?.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              today={today}
              mutate={mutateCompleted}
              projects={projects}
              timeFormat={timeFormat}
            />
          ))
        : null}
      <List.EmptyView icon={Icon.CheckCircle} title={empty.title} description={empty.description} />
    </List>
  );
}
