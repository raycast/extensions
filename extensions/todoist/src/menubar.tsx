import { MenuBarExtra, openCommandPreferences, getPreferenceValues } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { handleError, todoist } from "./api";
import { getSectionsWithDueDates } from "./helpers/sections";
import { checkTodoistApp } from "./helpers/isTodoistInstalled";
import { useEffect, useMemo } from "react";
import MenubarTask from "./components/MenubarTask";
import { Task } from "@doist/todoist-api-typescript";

export default function Command() {
  const isTodayView = getPreferenceValues().view === "today";
  const upcomingDays = getPreferenceValues().upcomingDays;
  const isUpcomingDaysView = upcomingDays !== "" && !isNaN(Number(upcomingDays));

  const {
    data: tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
    mutate: mutateTasks,
  } = useCachedPromise(() =>
    todoist.getTasks({
      filter: isTodayView ? "today|overdue" : isUpcomingDaysView ? `due before: +${upcomingDays} days` : "all",
    })
  );

  if (tasksError) {
    handleError({ error: tasksError, title: "Unable to get tasks" });
  }

  useEffect(() => {
    checkTodoistApp();
  }, []);

  const numOfTasksToday = useMemo(() => {
    if (tasks?.length) {
      if (isTodayView) {
        const len = tasks.length;

        return len > 0 ? len.toString() : "🎉";
      } else {
        const len = tasks?.filter((task) => task.due?.date === new Date().toISOString().substring(0, 10)).length;

        return len > 0 ? len.toString() : "🎉";
      }
    }
  }, [tasks]);

  return (
    <MenuBarExtra
      icon={{
        source: { light: "icon.png", dark: "icon@dark.png" },
      }}
      isLoading={isLoadingTasks}
      title={numOfTasksToday}
    >
      {isTodayView
        ? tasks && <TodayView tasks={tasks} mutateTasks={mutateTasks} />
        : tasks && <UpcomingView tasks={tasks} mutateTasks={mutateTasks} />}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

interface TaskViewProps {
  tasks: Task[];
  mutateTasks: MutatePromise<Task[] | undefined>;
}

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
    <MenuBarExtra.Item title="Congratulations! No upcoming tasks!" icon="🎉" />
  );
};

const TodayView = ({ tasks, mutateTasks }: TaskViewProps) => {
  return tasks.length > 0 ? (
    <>
      <MenuBarExtra.Item title="Tasks due today" />

      {tasks.map((task) => (
        <MenubarTask key={task.id} task={task} mutateTasks={mutateTasks} />
      ))}
    </>
  ) : (
    <MenuBarExtra.Item title="Congratulations! No tasks left for today!" icon="🎉" />
  );
};
