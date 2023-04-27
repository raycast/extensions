import { Task } from "@doist/todoist-api-typescript";
import { MenuBarExtra, openCommandPreferences, getPreferenceValues } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import removeMarkdown from "remove-markdown";

import { handleError, todoist } from "./api";
import MenubarTask from "./components/MenubarTask";
import View from "./components/View";
import { getSectionsWithDueDates } from "./helpers/sections";
import { useFocusedTask } from "./hooks/useFocusedTask";

type Preferences = {
  view: "today" | "upcoming";
  upcomingDays: string;
};

export default function Command() {
  const { focusedTask, unfocusTask } = useFocusedTask();
  const { view, upcomingDays } = getPreferenceValues<Preferences>();

  const isTodayView = view === "today";

  let filter = "";

  if (isTodayView) {
    filter = "today|overdue";
  } else if (upcomingDays && !isNaN(Number(upcomingDays))) {
    filter = `due before: +${upcomingDays} days`;
  } else {
    filter = "all";
  }

  const {
    data: tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
    mutate: mutateTasks,
  } = useCachedPromise(() => todoist.getTasks({ filter }));

  if (tasksError) {
    handleError({ error: tasksError, title: "Unable to get tasks" });
  }

  const menuBarExtraTitle = useMemo(() => {
    if (focusedTask.id) {
      return removeMarkdown(focusedTask.content);
    }

    if (tasks) {
      return tasks.length > 0 ? tasks.length.toString() : "🎉";
    }
  }, [focusedTask.id, tasks]);

  return (
    <View>
      <MenuBarExtra
        icon={{ source: { light: "icon.png", dark: "icon@dark.png" } }}
        isLoading={isLoadingTasks}
        title={menuBarExtraTitle}
      >
        {isTodayView
          ? tasks && <TodayView tasks={tasks} mutateTasks={mutateTasks} />
          : tasks && <UpcomingView tasks={tasks} mutateTasks={mutateTasks} />}

        <MenuBarExtra.Section>
          {focusedTask.id !== "" && <MenuBarExtra.Item title="Unfocus the current task" onAction={unfocusTask} />}

          <MenuBarExtra.Item
            title="Configure Command"
            shortcut={{ modifiers: ["cmd"], key: "," }}
            onAction={openCommandPreferences}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    </View>
  );
}

interface TaskViewProps {
  tasks: Task[];
  mutateTasks: MutatePromise<Task[] | undefined>;
}

const TodayView = ({ tasks, mutateTasks }: TaskViewProps) => {
  return tasks.length > 0 ? (
    <>
      <MenuBarExtra.Item title="Tasks due today" />

      {tasks.map((task) => (
        <MenubarTask key={task.id} task={task} mutateTasks={mutateTasks} />
      ))}
    </>
  ) : (
    <MenuBarExtra.Item title="Congratulations! No tasks left for today." icon="🎉" />
  );
};

const UpcomingView = ({ tasks, mutateTasks }: TaskViewProps): JSX.Element => {
  const upcomingDays = getPreferenceValues().upcomingDays;
  const isUpcomingDaysView = upcomingDays !== "" && !isNaN(Number(upcomingDays));

  const upcomingTasks = tasks?.filter((task) => task.due?.date) || [];
  const sections = getSectionsWithDueDates(upcomingTasks);

  return tasks.length > 0 ? (
    <>
      <MenuBarExtra.Item
        title={isUpcomingDaysView ? `Tasks due before the next ${upcomingDays} days` : "All upcoming tasks"}
      />

      {sections.map((section, index) => {
        return (
          <MenuBarExtra.Section title={section.name} key={index}>
            {section.tasks.map((task) => (
              <MenubarTask key={task.id} task={task} mutateTasks={mutateTasks} />
            ))}
          </MenuBarExtra.Section>
        );
      })}
    </>
  ) : (
    <MenuBarExtra.Item title="No upcoming tasks." />
  );
};
