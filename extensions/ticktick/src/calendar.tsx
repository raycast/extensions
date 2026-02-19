import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect } from "react";
import { useAllTasks } from "./hooks/useTasks";
import { useProjects } from "./hooks/useProjects";
import { completeTask } from "./api";
import { TaskForm } from "./components/TaskForm";
import { TaskDetail } from "./components/TaskDetail";
import { PRIORITY_ICONS, PRIORITY_COLORS } from "./constants";
import { Task } from "./types";

function getDayLabel(date: Date, today: Date): string {
  const diff = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (diff === 0) return `Today — ${weekday}, ${dateStr}`;
  if (diff === 1) return `Tomorrow — ${weekday}, ${dateStr}`;
  return `${weekday}, ${dateStr}`;
}

function getTimeLabel(task: Task): string | undefined {
  if (!task.dueDate || task.isAllDay) return undefined;
  const date = new Date(task.dueDate);
  if (date.getHours() === 0 && date.getMinutes() === 0) return undefined;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getTimeSort(task: Task): number {
  if (!task.dueDate || task.isAllDay) return -1;
  const date = new Date(task.dueDate);
  if (date.getHours() === 0 && date.getMinutes() === 0) return -1;
  return date.getHours() * 60 + date.getMinutes();
}

export default function CalendarCommand() {
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

  const isLoading = tasksLoading || projectsLoading;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: { label: string; date: Date }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push({ label: getDayLabel(d, today), date: d });
  }

  const activeTasks = tasks.filter((t) => t.status === 0 && t.dueDate);

  const buckets = days.map(({ label, date }) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayTasks = activeTasks
      .filter((t) => {
        const due = new Date(t.dueDate!);
        due.setHours(0, 0, 0, 0);
        return (
          due.getTime() >= date.getTime() && due.getTime() < nextDay.getTime()
        );
      })
      .sort((a, b) => getTimeSort(a) - getTimeSort(b));

    return { label, date, dayTasks };
  });

  const overdue = activeTasks
    .filter((t) => {
      const due = new Date(t.dueDate!);
      due.setHours(0, 0, 0, 0);
      return due.getTime() < today.getTime();
    })
    .sort(
      (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
    );

  const totalTasks =
    buckets.reduce((sum, b) => sum + b.dayTasks.length, 0) + overdue.length;

  function renderAgendaItem(task: Task) {
    const project = projects.find((p) => p.id === task.projectId);
    const timeLabel = getTimeLabel(task);

    const accessories: List.Item.Accessory[] = [];

    if (timeLabel) {
      accessories.push({
        tag: { value: timeLabel, color: Color.Blue },
        tooltip: "Scheduled time",
      });
    } else {
      accessories.push({
        tag: { value: "All Day", color: Color.SecondaryText },
      });
    }

    if (task.tags && task.tags.length > 0) {
      task.tags.slice(0, 2).forEach((tag) => {
        accessories.push({ tag: { value: tag, color: Color.Purple } });
      });
    }

    if (project) {
      accessories.push({
        icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
        text: { value: project.name, color: Color.SecondaryText },
      });
    }

    return (
      <List.Item
        key={task.id}
        title={task.title}
        subtitle={task.content?.trim() || undefined}
        icon={{
          source: PRIORITY_ICONS[task.priority] ?? Icon.Circle,
          tintColor: PRIORITY_COLORS[task.priority],
        }}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={
                <TaskDetail
                  task={task}
                  projects={projects}
                  onRefresh={revalidate}
                />
              }
            />
            <Action.Push
              title="Edit Task"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={
                <TaskForm
                  task={task}
                  projects={projects}
                  onSubmit={revalidate}
                />
              }
            />
            <ActionPanel.Section title="Task">
              <Action
                title="Complete Task"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={async () => {
                  try {
                    await completeTask(task.projectId, task.id);
                    await showHUD(`Completed: ${task.title}`);
                    revalidate();
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to complete task",
                      message: String(err),
                    });
                  }
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy & Open">
              <Action.OpenInBrowser
                title="Open in Ticktick"
                icon={Icon.Globe}
                url={`https://ticktick.com/webapp/#q/all/tasks/${task.id}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title="Copy Title"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={() => Clipboard.copy(task.title)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  function newTaskFormForDate(date: Date) {
    return (
      <TaskForm projects={projects} defaultDate={date} onSubmit={revalidate} />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter agenda...">
      {totalTasks === 0 && !isLoading && (
        <List.EmptyView
          icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
          title="Your week is clear"
          description="No tasks scheduled for the next 7 days"
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

      {overdue.length > 0 && (
        <List.Section
          title="Overdue"
          subtitle={`${overdue.length} task${overdue.length !== 1 ? "s" : ""}`}
        >
          {overdue.map(renderAgendaItem)}
        </List.Section>
      )}

      {buckets.map(({ label, date, dayTasks }) => {
        const isToday = date.getTime() === today.getTime();

        if (dayTasks.length === 0) {
          return (
            <List.Section key={label} title={label}>
              <List.Item
                title="No tasks"
                icon={{
                  source: isToday ? Icon.Circle : Icon.Minus,
                  tintColor: Color.SecondaryText,
                }}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="New Task for This Day"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={newTaskFormForDate(date)}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          );
        }

        return (
          <List.Section
            key={label}
            title={label}
            subtitle={`${dayTasks.length} task${dayTasks.length !== 1 ? "s" : ""}`}
          >
            {dayTasks.map(renderAgendaItem)}
          </List.Section>
        );
      })}
    </List>
  );
}
