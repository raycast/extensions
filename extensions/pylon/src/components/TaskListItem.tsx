import { List, Action, ActionPanel, Icon, Color, showToast, Toast, open } from "@raycast/api";
import { Task, TaskStatus, IssueState, updateTask } from "../api";
import { formatRelativeDate, isOverdue, getTaskUrl } from "../utils";

interface TaskListItemProps {
  task: Task;
  onStatusChange?: () => void;
}

const statusColors: Record<TaskStatus, Color> = {
  not_started: Color.SecondaryText,
  in_progress: Color.Blue,
  completed: Color.Green,
  canceled: Color.Red,
};

const statusLabels: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

const statusIcons: Record<TaskStatus, Icon> = {
  not_started: Icon.Circle,
  in_progress: Icon.CircleProgress50,
  completed: Icon.CheckCircle,
  canceled: Icon.XMarkCircle,
};

// Issue state labels for display
const stateLabels: Record<IssueState, string> = {
  new: "New",
  waiting_on_you: "Waiting on You",
  waiting_on_customer: "Waiting on Customer",
  on_hold: "On Hold",
  closed: "Closed",
};

const stateColors: Record<IssueState, Color> = {
  new: Color.Orange,
  waiting_on_you: Color.Red,
  waiting_on_customer: Color.Blue,
  on_hold: Color.Yellow,
  closed: Color.Green,
};

export function TaskListItem({ task, onStatusChange }: TaskListItemProps) {
  const accessories: List.Item.Accessory[] = [];

  // State/Status badge - prefer issue state if available
  if (task.state) {
    accessories.push({
      tag: {
        value: stateLabels[task.state],
        color: stateColors[task.state],
      },
    });
  } else {
    accessories.push({
      tag: {
        value: statusLabels[task.status],
        color: statusColors[task.status],
      },
    });
  }

  // Due date
  if (task.due_date) {
    const overdue = isOverdue(task.due_date) && task.status !== "completed";
    accessories.push({
      text: formatRelativeDate(task.due_date),
      icon: overdue ? { source: Icon.Clock, tintColor: Color.Red } : Icon.Calendar,
    });
  }

  // Account name
  if (task.account?.name) {
    accessories.push({
      text: task.account.name,
      icon: Icon.Building,
    });
  }

  // Type badge if it's a specific type
  if (task.type) {
    accessories.push({
      tag: task.type,
    });
  }

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      await updateTask(task.id, { status: newStatus });
      await showToast({
        style: Toast.Style.Success,
        title: "Status updated",
        message: `Changed to ${statusLabels[newStatus]}`,
      });
      onStatusChange?.();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Use issue link if available, otherwise construct task URL
  const taskUrl = task.link || getTaskUrl(task.id);

  return (
    <List.Item
      title={task.title}
      subtitle={task.assignee?.name}
      icon={{ source: statusIcons[task.status], tintColor: statusColors[task.status] }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open in Pylon" icon={Icon.Globe} onAction={() => open(taskUrl)} />
            <Action.CopyToClipboard title="Copy Link" content={taskUrl} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Change Status">
            {(["not_started", "in_progress", "completed", "canceled"] as TaskStatus[])
              .filter((s) => s !== task.status)
              .map((status) => (
                <Action
                  key={status}
                  title={statusLabels[status]}
                  icon={{ source: statusIcons[status], tintColor: statusColors[status] }}
                  onAction={() => handleStatusChange(status)}
                />
              ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
