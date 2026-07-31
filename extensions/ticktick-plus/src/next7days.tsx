import { List, Icon } from "@raycast/api";
import { addDays, format, isToday, isTomorrow, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { TaskItem } from "./components/TaskItem";
import { Task } from "./types/ticktick";

function getDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d");
}

function getTaskDate(task: Task): Date | null {
  if (!task.dueDate) return null;
  try {
    return parseISO(task.dueDate);
  } catch {
    return null;
  }
}

export default function Next7Days() {
  useAlerts();
  const { data, isLoading, revalidate } = useSync();
  const projectMap = new Map(data.projects.map((p) => [p.id, p.name]));
  const today = startOfDay(new Date());
  // Inclusive interval today..today+6 = 7 days total.
  const end = addDays(today, 6);

  const upcoming = data.tasks
    .filter((t) => {
      const d = getTaskDate(t);
      if (!d) return false;
      return isWithinInterval(startOfDay(d), { start: today, end });
    })
    .sort((a, b) => (getTaskDate(a)?.getTime() ?? 0) - (getTaskDate(b)?.getTime() ?? 0));

  const grouped = new Map<string, Task[]>();
  for (const task of upcoming) {
    const key = format(getTaskDate(task)!, "yyyy-MM-dd");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(task);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter upcoming tasks...">
      {upcoming.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Calendar} title="Nothing upcoming" description="No tasks in the next 7 days." />
      ) : (
        Array.from(grouped.entries()).map(([dateKey, tasks]) => (
          <List.Section
            key={dateKey}
            title={getDayLabel(parseISO(dateKey))}
            subtitle={`${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
          >
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                projects={data.projects}
                projectName={projectMap.get(task.projectId)}
                onComplete={revalidate}
                onDelete={revalidate}
                onRevalidate={revalidate}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
