import { Color, Icon, List } from "@raycast/api";
import { SpProject, SpTag, SpTask } from "../lib/sp-models";
import {
  formatDateValue,
  formatTaskTiming,
  getTaskStateLabel,
} from "./task-format";

const getStateAccessoryIcon = (
  state: ReturnType<typeof getTaskStateLabel>,
  isArchived: boolean,
) => {
  if (isArchived) {
    return { source: Icon.Archive, tintColor: Color.SecondaryText };
  }
  if (state === "Current") {
    return { source: Icon.PlayFilled, tintColor: Color.Green };
  }
  if (state === "Done") {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (state === "Subtask") {
    return { source: Icon.Dot, tintColor: Color.SecondaryText };
  }
  return { source: Icon.Circle, tintColor: Color.SecondaryText };
};

export const getTaskIcon = (task: SpTask, currentTaskId: string | null) => {
  if (task.id === currentTaskId) {
    return { source: Icon.PlayFilled, tintColor: Color.Green };
  }
  if (task.isDone) {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (task.parentId) {
    return { source: Icon.Dot, tintColor: Color.SecondaryText };
  }
  return Icon.Circle;
};

export const getTaskAccessories = (
  task: SpTask,
  currentTaskId: string | null,
  projectById: Map<string, SpProject>,
  tagById: Map<string, SpTag>,
  options: { archived?: boolean } = {},
): List.Item.Accessory[] => {
  const accessories: List.Item.Accessory[] = [];
  const state = getTaskStateLabel(task, currentTaskId);

  accessories.push({
    icon: getStateAccessoryIcon(state, !!options.archived),
    text: options.archived ? "Archived" : state,
    tooltip: "State",
  });

  if (task.projectId && projectById.has(task.projectId)) {
    accessories.push({
      icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
      text: projectById.get(task.projectId)?.title ?? task.projectId,
      tooltip: "Project",
    });
  }

  if (task.tagIds.length) {
    const tagNames = task.tagIds
      .map((id) => tagById.get(id)?.title ?? id)
      .slice(0, 2);
    accessories.push({
      icon: { source: Icon.Tag, tintColor: Color.SecondaryText },
      text: tagNames.join(", "),
      tooltip: "Tags",
    });
  }

  const dueDate = formatDateValue(task.dueWithTime ?? task.dueDay);
  if (dueDate) {
    accessories.push({
      icon: { source: Icon.Calendar, tintColor: Color.SecondaryText },
      date: dueDate,
      tooltip: "Due",
    });
  }

  const plannedDate = formatDateValue(task.plannedAt);
  if (plannedDate) {
    accessories.push({
      icon: { source: Icon.Clock, tintColor: Color.SecondaryText },
      date: plannedDate,
      tooltip: "Planned",
    });
  }

  const timing = formatTaskTiming(task);
  if (timing.estimate) {
    accessories.push({
      icon: { source: Icon.Hourglass, tintColor: Color.SecondaryText },
      text: timing.estimate,
      tooltip: "Estimate",
    });
  }
  if (timing.spent) {
    accessories.push({
      icon: { source: Icon.Stopwatch, tintColor: Color.SecondaryText },
      text: timing.spent,
      tooltip: "Time spent",
    });
  }

  if (task.subTaskIds.length) {
    accessories.push({
      icon: { source: Icon.List, tintColor: Color.SecondaryText },
      text: `${task.subTaskIds.length} subtasks`,
      tooltip: "Subtasks",
    });
  }

  return accessories;
};
