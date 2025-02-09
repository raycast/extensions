import { Icon, Image } from "@raycast/api";
import React from "react";

import { Collaborator, Project, Task } from "../api";

import { isExactTimeTask } from "./dates";

export type SortByOption = "default" | "name" | "assignee" | "date" | "priority" | "project";

export type SortByOptions = {
  label: string;
  icon: Image.ImageLike;
  value: SortByOption;
}[];

export type SortByProp = {
  value: SortByOption;
  setValue: React.Dispatch<React.SetStateAction<SortByOption>>;
  options: SortByOptions;
};

export const sortByOptions: SortByOptions = [
  { label: "Default", icon: Icon.Document, value: "default" },
  { label: "Name", icon: Icon.Lowercase, value: "name" },
  { label: "Assignee", icon: Icon.Person, value: "assignee" },
  { label: "Date", icon: Icon.List, value: "date" },
  { label: "Priority", icon: Icon.LevelMeter, value: "priority" },
  { label: "Project", icon: Icon.Tag, value: "project" },
];

export function getSortByOptions(tasks: Task[], optionsToExclude?: SortByOption[]) {
  const otherAssigneesExist = tasks.some((task) => !!task.responsible_uid);

  return sortByOptions.filter((option) => {
    if (optionsToExclude && optionsToExclude.includes(option.value)) {
      return false;
    }

    if (option.value === "assignee" && !otherAssigneesExist) {
      return false;
    }

    return true;
  });
}

export type SectionWithTasks = {
  name: string;
  tasks: Task[];
};

export function sortByName(a: Task, b: Task): number {
  return a.content.localeCompare(b.content);
}

export function sortByAssignee(collaborators: Collaborator[], a: Task, b: Task): number {
  const aAssignee = a.responsible_uid ? collaborators.find((c) => c.id === a.responsible_uid) : null;
  const bAssignee = b.responsible_uid ? collaborators.find((c) => c.id === b.responsible_uid) : null;

  const aName = aAssignee ? aAssignee.full_name : "Unassigned";
  const bName = bAssignee ? bAssignee.full_name : "Unassigned";

  return aName.localeCompare(bName);
}

export function sortByDate(a: Task, b: Task): number {
  // Handle tasks with no due dates
  if (!a.due && !b.due) {
    return 0;
  }
  if (!a.due) {
    return 1;
  }
  if (!b.due) {
    return -1;
  }

  const aIsExactTime = isExactTimeTask(a);
  const bIsExactTime = isExactTimeTask(b);

  // Sort by datetime due dates (earliest first)
  if (aIsExactTime && bIsExactTime) {
    const aDue = new Date(a.due.date);
    const bDue = new Date(b.due.date);
    return aDue.getTime() - bDue.getTime();
  }

  // Sort by simple due dates (earliest first)
  if (!aIsExactTime && !bIsExactTime) {
    const aDue = new Date(a.due.date);
    const bDue = new Date(b.due.date);
    return aDue.getTime() - bDue.getTime();
  }

  // If one task has a datetime due date and the other has a simple due date,
  // place the task with the datetime due date first
  return aIsExactTime ? -1 : 1;
}

export function sortByPriority(a: Task, b: Task): number {
  return b.priority - a.priority;
}

export function sortByProject(projects: Project[], a: Task, b: Task): number {
  const projectA = projects.find((project) => project.id === a.project_id);
  const projectB = projects.find((project) => project.id === b.project_id);
  const projectNameA = projectA ? projectA.name : "";
  const projectNameB = projectB ? projectB.name : "";
  return projectNameA.localeCompare(projectNameB);
}

export type OrderByOption = "asc" | "desc";

export type OrderByOptions = {
  label: string;
  icon: Image.ImageLike;
  value: OrderByOption;
}[];

export const orderByOptions: OrderByOptions = [
  { label: "Ascending", icon: Icon.ArrowDown, value: "asc" },
  { label: "Descending", icon: Icon.ArrowUp, value: "desc" },
];

export function applySortOrder(orderBy: OrderByOption, sortFunc: (a: Task, b: Task) => number) {
  return orderBy === "desc" ? (a: Task, b: Task) => sortFunc(b, a) : sortFunc;
}
