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

export default function TodayCommand() {
  const {
    tasks,
    isLoading: tasksLoading,
    revalidate,
    error: tasksError,
  } = useAllTasks();
  const { projects, isLoading: projectsLoading } = useProjects();

  useEffect(() => {
    if (tasksError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: String(tasksError),
      });
    }
  }, [tasksError]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTasks = tasks.filter((t) => {
    if (t.status !== 0) return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return (
      due.getTime() >= today.getTime() && due.getTime() < tomorrow.getTime()
    );
  });

  const overdueTasks = tasks.filter((t) => {
    if (t.status !== 0) return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
  });

  const undatedTasks = tasks.filter((t) => t.status === 0 && !t.dueDate);

  const isLoading = tasksLoading || projectsLoading;
  const isEmpty =
    !isLoading &&
    todayTasks.length === 0 &&
    overdueTasks.length === 0 &&
    undatedTasks.length === 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter today's tasks...">
      {isEmpty && (
        <List.EmptyView
          icon={{ source: Icon.Sun, tintColor: Color.Yellow }}
          title="All clear for today"
          description="No tasks due today — open the action panel to add one"
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

      {/* Overdue section uses a warning-level subtitle to flag urgency without
          requiring the user to read each individual task's due badge. */}
      {overdueTasks.length > 0 && (
        <List.Section
          title="Overdue"
          subtitle={`${overdueTasks.length} task${overdueTasks.length !== 1 ? "s" : ""} past due`}
        >
          {overdueTasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              projects={projects}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}

      {todayTasks.length > 0 && (
        <List.Section
          title="Today"
          subtitle={`${todayTasks.length} task${todayTasks.length !== 1 ? "s" : ""}`}
        >
          {todayTasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              projects={projects}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}

      {undatedTasks.length > 0 && (
        <List.Section
          title="No Due Date"
          subtitle={`${undatedTasks.length} task${undatedTasks.length !== 1 ? "s" : ""}`}
        >
          {undatedTasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              projects={projects}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
