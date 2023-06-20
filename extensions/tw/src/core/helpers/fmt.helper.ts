import { Color } from "@raycast/api";
import {
  isStateDeleted,
  isStateDone,
  isStateActive,
  isStateOverdue,
  ActionTag,
  Priority,
  State,
  indicators,
  Task,
  ActionProject,
} from "../types";
import { isDateOverdue } from "./date.helper";
import { TaskView, priorities, states } from "./ui.helper";

export const getId = <T extends string>(task: Task | TaskView, defaultValue: T = "" as T) => {
  if (task.id) return task.id.toString();
  if (task.uuid && typeof task.uuid === "string") {
    return task.uuid.includes("-") ? task.uuid.split("-")[0] : task.uuid;
  }
  return defaultValue;
};

export const project = (value: string): ActionProject => `${indicators.project}${value}`;

export const tag = (value: string): ActionTag => `${indicators.tag}${value}`;

export const withTags = (value?: string[]) => value?.map(tag) ?? [];

export const priority = (value?: Priority) => {
  if (!value) return undefined;
  const prop = priorities[value];

  return {
    value: `${prop.abbr} ${prop.label}`,
    color: prop.color,
  };
};

export const dueColor = (value: string | undefined) => (isDateOverdue(value) ? states.overdue.color : Color.Magenta);

export const urgency = (urgency?: number) => (urgency ?? 0).toFixed(1);

export const getState = (task: Task): State | undefined =>
  isStateDeleted(task)
    ? "deleted"
    : isStateDone(task)
    ? "done"
    : isStateActive(task)
    ? "active"
    : isStateOverdue(task)
    ? "overdue"
    : undefined;
