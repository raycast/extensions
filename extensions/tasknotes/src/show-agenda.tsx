import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { assertVaultIsReadable, formatDate, isMultipleVaultMode, listTaskNotes, type TaskNote } from "./tasknotes";
import { TaskListItem } from "./task-list-item";

type AgendaSection = {
  title: string;
  tasks: TaskNote[];
};

export default function Command() {
  const showVaultBadge = isMultipleVaultMode();
  const { data, error, isLoading, revalidate } = useCachedPromise(async () => {
    await assertVaultIsReadable();
    return agendaSections(await listTaskNotes());
  });

  if (error) {
    return <Detail markdown={`# TaskNotes Agenda\n\n${error.message}`} />;
  }

  const sections = data ?? [];
  const taskCount = sections.reduce((count, section) => count + section.tasks.length, 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search agenda tasks...">
      {!isLoading && taskCount === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No agenda tasks found"
          description="Agenda shows open TaskNotes tasks with a due or scheduled date."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={String(section.tasks.length)}>
          {section.tasks.map((task) => (
            <TaskListItem
              key={task.path}
              task={task}
              revalidate={revalidate}
              showVaultBadge={showVaultBadge}
              dateAccessoryMode="agenda"
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function agendaSections(tasks: TaskNote[]): AgendaSection[] {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const upcoming = addDays(today, 2);
  const openDatedTasks = tasks
    .filter((task) => !task.completed && agendaDate(task))
    .sort((a, b) => sortDate(agendaDate(a)) - sortDate(agendaDate(b)) || a.title.localeCompare(b.title));

  return [
    {
      title: "Overdue",
      tasks: openDatedTasks.filter((task) => sortDate(agendaDate(task)) < sortDate(formatDate(today))),
    },
    { title: "Today", tasks: openDatedTasks.filter((task) => agendaDate(task) === formatDate(today)) },
    { title: "Tomorrow", tasks: openDatedTasks.filter((task) => agendaDate(task) === formatDate(tomorrow)) },
    {
      title: "Upcoming",
      tasks: openDatedTasks.filter((task) => sortDate(agendaDate(task)) >= sortDate(formatDate(upcoming))),
    },
  ].filter((section) => section.tasks.length > 0);
}

function agendaDate(task: TaskNote) {
  if (task.due && task.scheduled) return sortDate(task.scheduled) < sortDate(task.due) ? task.scheduled : task.due;
  return task.due || task.scheduled;
}

function sortDate(value: string | undefined) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}
