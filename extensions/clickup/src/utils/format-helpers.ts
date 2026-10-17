import { Icon, Image, List, Detail } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { ClickUpPriority, ClickUpTask, ClickUpUser } from "../types/clickup";
import { isSubtask } from "./task-helpers";

type ItemAccessory = List.Item.Accessory;
type TagListItemProps = Detail.Metadata.TagList.Item.Props;

/** Format a date using Intl.DateTimeFormat */
export function formatDate(date: string | number | null | undefined): string {
  if (!date) return "N/A";
  const timestamp = typeof date === "string" ? parseInt(date, 10) : Number(date);
  if (isNaN(timestamp) || timestamp === 0) return "N/A";
  const dateObj = new Date(timestamp);
  if (isNaN(dateObj.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dateObj);
}

/** Format a ClickUp user for display with avatar or initials */
export function formatUser(user: ClickUpUser | undefined): Pick<ItemAccessory, "icon"> & { text: string } {
  if (!user) {
    return { icon: Icon.Person, text: "Unknown" };
  }
  if (user.profilePicture) {
    return { icon: { mask: Image.Mask.Circle, source: user.profilePicture }, text: user.username };
  }
  const avatarOptions = user.color ? { background: user.color, gradient: false } : { gradient: false };
  return { icon: getAvatarIcon(user.username, avatarOptions), text: user.username };
}

/** Get priority display properties */
export function getPriorityDisplay(priority: ClickUpPriority | null | undefined): TagListItemProps {
  if (!priority) {
    return {};
  }
  return { color: priority.color, icon: Icon.Flag, text: priority.priority };
}

/** Get task status display properties */
export function getStatusDisplay(status: ClickUpTask["status"]): TagListItemProps {
  return { color: status.color, text: status.status.toUpperCase() };
}

/** Pluralize a noun based on count */
export function pluralize(count: number, noun: string, suffix = "s"): string {
  return `${noun}${count !== 1 ? suffix : ""}`;
}

/**
 * Build accessories array for a task list item
 */
export function buildTaskAccessories(task: ClickUpTask): ItemAccessory[] {
  const accessories: ItemAccessory[] = [];
  const isSubTask = isSubtask(task);

  if (task.due_date) {
    accessories.push({
      date: new Date(Number(task.due_date)),
      tooltip: `Due: ${new Date(Number(task.due_date)).toLocaleString()}`,
    });
  }

  for (const assignee of task.assignees) {
    const userDisplay = formatUser(assignee);
    accessories.push({
      icon: userDisplay.icon,
      tooltip: assignee.username,
    });
  }

  if (isSubTask && task.priority) {
    accessories.push({
      icon: { source: Icon.Flag, tintColor: task.priority.color },
      tooltip: `Priority: ${task.priority.priority}`,
    });
  }

  accessories.push({
    tag: { color: task.status.color, value: task.status.status.toUpperCase() },
  });

  return accessories;
}

/** Build subtitle for task with subtask count */
export function buildSubtitle(subtaskCount: number): string {
  const subtitleParts: string[] = [];
  if (subtaskCount > 0) {
    subtitleParts.push(`${subtaskCount} ${pluralize(subtaskCount, "subtask")}`);
  }
  return subtitleParts.join(" ");
}
