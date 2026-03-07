import { List, Icon, Color } from "@raycast/api";
import { Task } from "../models/types";
import { format, formatDistanceToNow } from "date-fns";
import { TaskActions } from "./TaskActions";

import { displayDueDate, isOverdue, isFullDayTask } from "../utils/dateUtils";
import { getPriorityIcon, getStatusIcon } from "../utils/helpers";

interface TaskListItemProps {
  task: Task;
  onTaskUpdated: () => Promise<void>;
  vaultNameFromAPI?: string;
}

export function TaskListItem({ task, onTaskUpdated, vaultNameFromAPI }: TaskListItemProps) {
  const isCompleted = task.status === "done";
  const keywords = [task.title];
  const accessories: List.Item.Accessory[] = [];
  const overdue = task.due ? isOverdue(task.due) : false;

  // Build subtitle with formatted tags and contexts separated by pipe
  const subtitleParts: string[] = [];

  if (task.tags.length > 0) {
    subtitleParts.push(task.tags.map((tag) => `#${tag}`).join(", "));
  }

  if (task.contexts.length > 0) {
    subtitleParts.push(task.contexts.map((context) => `${context}`).join(", "));
  }

  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" | ") : undefined;

  if ((task.priority && task.priority == "high") || task.priority == "low") {
    accessories.push({
      icon: getPriorityIcon(task.priority, true),
      tooltip: `Priority: ${task.priority === "high" ? "High" : "Low"}`,
    });

    keywords.push(task.priority);
  }

  if (task.tags.length > 0) {
    keywords.push(...task.tags);
  }

  if (task.contexts.length > 0) {
    keywords.push(...task.contexts);
  }

  if (task.due) {
    const { due } = task;
    const shouldShowFriendlyDate = isFullDayTask(task.due);

    accessories.push({
      icon: { source: Icon.Calendar, tintColor: !isCompleted && overdue ? Color.Red : undefined },
      text: {
        value: shouldShowFriendlyDate ? displayDueDate(task.due) : formatDistanceToNow(task.due, { addSuffix: true }),
        color: !isCompleted && overdue ? Color.Red : undefined,
      },
      tooltip: `Due date: ${
        shouldShowFriendlyDate ? displayDueDate(task.due) : format(task.due, "EEEE dd MMMM yyyy 'at' HH:mm")
      }`,
    });

    keywords.push(format(due, "dd"), format(due, "MMMM"));
  }

  return (
    <List.Item
      icon={getStatusIcon(task.status)}
      key={task.id}
      title={task.title}
      subtitle={subtitle}
      accessories={accessories}
      keywords={keywords}
      actions={<TaskActions task={task} onTaskUpdated={onTaskUpdated} vaultNameFromAPI={vaultNameFromAPI} />}
    />
  );
}
