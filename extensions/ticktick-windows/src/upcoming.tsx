import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect } from "react";
import { useAllTasks } from "./hooks/useTasks";
import { useProjects } from "./hooks/useProjects";
import { TaskListItem } from "./components/TaskListItem";
import { TaskForm } from "./components/TaskForm";

export default function UpcomingCommand() {
  const { tasks, isLoading: tasksLoading, revalidate, error } = useAllTasks();
  const { projects, isLoading: projectsLoading } = useProjects();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: String(error),
      });
    }
  }, [error]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build the 7-day window. "Today" and "Tomorrow" use short labels; the
  // remaining days show weekday + date so the user can orient themselves
  // without mental arithmetic.
  const days: { label: string; date: Date }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const label =
      i === 0
        ? "Today"
        : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            });
    days.push({ label, date: d });
  }

  const activeTasks = tasks.filter((t) => t.status === 0 && t.dueDate);

  // Pre-compute all day buckets so we can derive a total for the empty view.
  const buckets = days.map(({ label, date }) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayTasks = activeTasks.filter((t) => {
      const due = new Date(t.dueDate!);
      due.setHours(0, 0, 0, 0);
      return (
        due.getTime() >= date.getTime() && due.getTime() < nextDay.getTime()
      );
    });

    return { label, dayTasks };
  });

  const totalTasks = buckets.reduce((sum, b) => sum + b.dayTasks.length, 0);
  const isLoading = tasksLoading || projectsLoading;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter upcoming tasks...">
      {totalTasks === 0 && !isLoading && (
        <List.EmptyView
          icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
          title="Nothing scheduled this week"
          description="Assign due dates to tasks to see them here"
          actions={
            <ActionPanel>
              <Action.Push
                title="New Task"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<TaskForm projects={projects} onSubmit={revalidate} />}
              />
            </ActionPanel>
          }
        />
      )}

      {buckets.map(({ label, dayTasks }) => {
        if (dayTasks.length === 0) return null;

        return (
          <List.Section
            key={label}
            title={label}
            // Singular/plural task count for correct grammar
            subtitle={`${dayTasks.length} task${dayTasks.length !== 1 ? "s" : ""}`}
          >
            {dayTasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                projects={projects}
                onRefresh={revalidate}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
