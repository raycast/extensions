import { Color } from "@raycast/api";
import { format, isBefore, isThisWeek, isThisYear, isToday, isTomorrow, isYesterday } from "date-fns";
import { Task } from "../api/tasks";
import { AsanaColors, asanaToRaycastColor } from "./colors";

export function getTaskSubtitle(task: Task): { value: string; tooltip: string } | string {
  const numberOfProjects = task.projects.length;

  if (numberOfProjects === 0) {
    return "";
  }

  const firstProject = task.projects[0];
  if (numberOfProjects === 1) {
    return { value: firstProject.name, tooltip: `Project: ${firstProject.name}` };
  }

  const projectNames = task.projects.map((project) => project.name).join(", ");
  return { value: `${firstProject.name} + ${numberOfProjects - 1}`, tooltip: `Projects: ${projectNames}` };
}

function formatDateText(date: Date) {
  if (isYesterday(date)) {
    return "Yesterday";
  }

  if (isToday(date)) {
    return "Today";
  }

  if (isTomorrow(date)) {
    return "Tomorrow";
  }

  if (isThisWeek(date)) {
    return format(date, "EEEE");
  }

  if (isThisYear(date)) {
    return format(date, "d MMM");
  }

  return format(date, "d MMM, yyyy");
}

export function getDueDateText(task: Task) {
  if (task.due_at) {
    const date = new Date(task.due_at);
    return `${formatDateText(date)} ${format(date, "HH:mm")}`;
  }

  if (task.due_on) {
    return formatDateText(new Date(task.due_on));
  }

  return "No due date";
}

export function getDueDateColor(task: Task) {
  if (task.due_at) {
    const date = new Date(task.due_at);
    const now = new Date();

    if (isBefore(date, now)) {
      return asanaToRaycastColor(AsanaColors.red);
    }

    if (isToday(date) || isTomorrow(date)) {
      return asanaToRaycastColor(AsanaColors.green);
    }
  }

  if (task.due_on) {
    const date = new Date(task.due_on);
    const today = new Date(format(Date.now(), "yyyy-MM-dd"));

    if (isBefore(date, today)) {
      return asanaToRaycastColor(AsanaColors.red);
    }

    if (isToday(date) || isTomorrow(date)) {
      return asanaToRaycastColor(AsanaColors.green);
    }
  }

  return Color.PrimaryText;
}
