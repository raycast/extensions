import {
  Icon,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Task, closeTask, getBaseUrl, getOpenTasks, getTaskUrl, getUserSettings, updateTask } from "./api";
import { addDays, displayDue, todayIn } from "./helpers/dates";
import { getOverdueTasks, getTodayTasks } from "./helpers/groupBy";
import { getPriorityIcon } from "./helpers/priorities";

const MAX_TASKS_PER_SECTION = 10;

function truncate(text: string, maxLength = 40): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function MenuBarTask({
  task,
  today,
  timeFormat,
  revalidate,
}: {
  task: Task;
  today: string;
  timeFormat?: "12h" | "24h";
  revalidate: () => void;
}) {
  return (
    <MenuBarExtra.Submenu icon={getPriorityIcon(task)} title={truncate(task.content)}>
      <MenuBarExtra.Item title="Open in OpenTask" icon={Icon.Globe} onAction={() => open(getTaskUrl(task.id))} />
      <MenuBarExtra.Item
        title="Complete Task"
        icon={Icon.Checkmark}
        onAction={async () => {
          await closeTask(task.id);
          revalidate();
        }}
      />
      {!task.due?.is_recurring ? (
        <MenuBarExtra.Item
          title="Postpone to Tomorrow"
          icon={Icon.ArrowRight}
          onAction={async () => {
            const tomorrow = addDays(today, 1);
            await updateTask(task.id, {
              due: task.due?.time ? { date: tomorrow, time: task.due.time } : { date: tomorrow },
            });
            revalidate();
          }}
        />
      ) : null}
      {task.due ? <MenuBarExtra.Item title={displayDue(task.due, today, timeFormat)} icon={Icon.Calendar} /> : null}
    </MenuBarExtra.Submenu>
  );
}

export default function MenuBar() {
  const { hideMenuBarCount } = getPreferenceValues<Preferences.MenuBar>();
  const { data: tasks, isLoading, revalidate } = useCachedPromise(getOpenTasks, [], { keepPreviousData: true });
  const { data: settings } = useCachedPromise(getUserSettings, [], { keepPreviousData: true });

  const today = todayIn(settings?.timezone);
  const overdue = getOverdueTasks(tasks ?? [], today);
  const dueToday = getTodayTasks(tasks ?? [], today);
  const count = overdue.length + dueToday.length;

  return (
    <MenuBarExtra
      icon={{ source: { light: "icon.png", dark: "icon@dark.png" } }}
      title={!hideMenuBarCount && count > 0 ? String(count) : undefined}
      tooltip="OpenTask — tasks due today"
      isLoading={isLoading}
    >
      {count === 0 ? <MenuBarExtra.Item title="No tasks due today 🎉" /> : null}
      {overdue.length > 0 ? (
        <MenuBarExtra.Section title="Overdue">
          {overdue.slice(0, MAX_TASKS_PER_SECTION).map((task) => (
            <MenuBarTask
              key={task.id}
              task={task}
              today={today}
              timeFormat={settings?.timeFormat}
              revalidate={revalidate}
            />
          ))}
          {overdue.length > MAX_TASKS_PER_SECTION ? (
            <MenuBarExtra.Item title={`… and ${overdue.length - MAX_TASKS_PER_SECTION} more`} />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}
      {dueToday.length > 0 ? (
        <MenuBarExtra.Section title="Today">
          {dueToday.slice(0, MAX_TASKS_PER_SECTION).map((task) => (
            <MenuBarTask
              key={task.id}
              task={task}
              today={today}
              timeFormat={settings?.timeFormat}
              revalidate={revalidate}
            />
          ))}
          {dueToday.length > MAX_TASKS_PER_SECTION ? (
            <MenuBarExtra.Item title={`… and ${dueToday.length - MAX_TASKS_PER_SECTION} more`} />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open My Tasks"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "home", type: LaunchType.UserInitiated, context: { view: "today" } })}
        />
        <MenuBarExtra.Item
          title="Create Task"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "create-task", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Open OpenTask" icon={Icon.Globe} onAction={() => open(getBaseUrl())} />
        <MenuBarExtra.Item title="Configure Command" icon={Icon.Gear} onAction={() => openCommandPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
