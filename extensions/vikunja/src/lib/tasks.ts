import { Color } from "@raycast/api";

import type { Project, Task } from "../types/vikunja";

export function isAssignedToUser(task: Task, userId?: number) {
  if (!userId) {
    return false;
  }

  return task.assignees?.some((assignee) => assignee.id === userId) ?? false;
}

export function getProjectTitle(projects: Project[], projectId?: number) {
  if (!projectId) {
    return undefined;
  }

  return projects.find((project) => project.id === projectId)?.title;
}

export function getPriorityColor(priority?: number) {
  if (priority === undefined) {
    return undefined;
  }

  if (priority >= 8) {
    return Color.Red;
  }

  if (priority >= 5) {
    return Color.Orange;
  }

  if (priority >= 3) {
    return Color.Yellow;
  }

  if (priority >= 1) {
    return Color.Blue;
  }

  return Color.SecondaryText;
}
