import {
  ActionPanel,
  Icon,
  List,
  ListItemProps,
  OpenInBrowserAction,
  confirmAlert,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { addDays } from "date-fns";
import { Project, Task, UpdateTaskArgs } from "@doist/todoist-api-typescript";
import { mutate } from "swr";
import { ViewMode, SWRKeys } from "../types";
import { isRecurring, displayDueDate, getAPIDate } from "../utils";
import { priorities } from "../constants";
import { todoist, handleError } from "../api";

const schedules = [
  { name: "Today", amount: 0 },
  { name: "Tomorrow", amount: 1 },
  { name: "Next Week", amount: 7 },
];
interface TaskListItemProps {
  task: Task;
  mode: ViewMode;
  projects?: Project[];
}

export default function TaskListItem({ task, mode, projects }: TaskListItemProps): JSX.Element {
  async function completeTask(task: Task) {
    await showToast(ToastStyle.Animated, "Completing task");

    try {
      await todoist.closeTask(task.id);
      await showToast(ToastStyle.Success, "Task updated");
      mutate(SWRKeys.tasks);
    } catch (error) {
      handleError({ error, title: "Unable to complete task" });
    }
  }

  async function updateTask(task: Task, payload: UpdateTaskArgs) {
    await showToast(ToastStyle.Animated, "Updating task");

    try {
      await todoist.updateTask(task.id, payload);
      await showToast(ToastStyle.Success, "Task updated");
      mutate(SWRKeys.tasks);
    } catch (error) {
      handleError({ error, title: "Unable to update task" });
    }
  }

  async function deleteTask(task: Task) {
    if (await confirmAlert({ title: "Are you sure you want to delete this task?" })) {
      await showToast(ToastStyle.Animated, "Deleting task");

      try {
        await todoist.deleteTask(task.id);
        await showToast(ToastStyle.Success, "Task deleted");
        mutate(SWRKeys.tasks);
      } catch (error) {
        handleError({ error, title: "Unable to delete task" });
      }
    }
  }

  const additionalListItemProps: Partial<ListItemProps> & { keywords: string[] } = { keywords: [] };

  switch (mode) {
    case ViewMode.project:
      if (task.due?.date) {
        additionalListItemProps.accessoryTitle = displayDueDate(task.due.date);
      }
      break;
    case ViewMode.date:
      if (projects && projects.length > 0) {
        const project = projects.find((project) => project.id === task.projectId);

        if (project) {
          additionalListItemProps.accessoryTitle = project.name;
          additionalListItemProps.keywords.push(project.name);
        }
      }
  }

  if (isRecurring(task)) {
    additionalListItemProps.accessoryIcon = Icon.ArrowClockwise;
  }

  const priority = priorities.find((p) => p.value === task.priority);

  if (priority) {
    const icon = priority.value === 1 ? Icon.Circle : { source: Icon.Circle, tintColor: priority.color };
    additionalListItemProps.keywords.push(priority.searchKeyword);
    additionalListItemProps.icon = icon;
  }

  return (
    <List.Item
      id={String(task.id)}
      title={task.content}
      subtitle={task.description}
      {...additionalListItemProps}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={task.url} />

          <ActionPanel.Item
            id="completeTask"
            title="Complete Task"
            icon={Icon.Checkmark}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => completeTask(task)}
          />

          <ActionPanel.Submenu
            icon={Icon.Calendar}
            title="Schedule..."
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          >
            {schedules.map(({ name, amount }) => (
              <ActionPanel.Item
                key={name}
                id={name}
                title={name}
                onAction={() => updateTask(task, { dueDate: getAPIDate(addDays(new Date(), amount)) })}
              />
            ))}
          </ActionPanel.Submenu>

          <ActionPanel.Submenu
            icon={Icon.LevelMeter}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            title="Change priority..."
          >
            {priorities.map(({ value, name, color }) => (
              <ActionPanel.Item
                key={name}
                id={name}
                title={name}
                icon={{ source: Icon.Circle, tintColor: color }}
                onAction={() => updateTask(task, { priority: value })}
              />
            ))}
          </ActionPanel.Submenu>

          <ActionPanel.Item
            id="deleteTask"
            title="Delete Task"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => deleteTask(task)}
          />
        </ActionPanel>
      }
    />
  );
}
