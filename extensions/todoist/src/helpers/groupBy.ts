import { Label, Project, Task } from "@doist/todoist-api-typescript";
import { Icon, Image } from "@raycast/api";
import { compareAsc } from "date-fns";
import { partition } from "lodash";
import React from "react";

import { priorities } from "../constants";

import { displayDueDate, isOverdue } from "./dates";

export type GroupByOption = "default" | "priority" | "project" | "date" | "label";

export type GroupByOptions = {
  label: string;
  icon: Image.ImageLike;
  value: GroupByOption;
}[];

export type GroupByProp = {
  value: GroupByOption;
  setValue: React.Dispatch<React.SetStateAction<GroupByOption>>;
  options: GroupByOptions;
};

export const todayGroupByOptions: GroupByOptions = [
  { label: "Default", icon: Icon.Document, value: "default" },
  { label: "Priority", icon: Icon.LevelMeter, value: "priority" },
  { label: "Project", icon: Icon.List, value: "project" },
  { label: "Label", icon: Icon.Tag, value: "label" },
];

export const projectGroupByOptions: GroupByOptions = [
  { label: "Default", icon: Icon.Document, value: "default" },
  { label: "Priority", icon: Icon.LevelMeter, value: "priority" },
  { label: "Date", icon: Icon.Calendar, value: "date" },
  { label: "Label", icon: Icon.Tag, value: "label" },
];

export type SectionWithTasks = {
  name: string;
  tasks: Task[];
};

export function partitionTasksWithOverdue(tasks: Task[]) {
  return partition(tasks, (task: Task) => task.due?.date && isOverdue(new Date(task.due.date)));
}

export function getSectionsWithDueDates(tasks: Task[]) {
  const [overdue, upcoming] = partitionTasksWithOverdue(tasks);

  const allDueDates = [...new Set(upcoming.map((task) => task.due?.date))] as string[];
  allDueDates.sort((dateA, dateB) => compareAsc(new Date(dateA), new Date(dateB)));

  const sections = allDueDates.map((date) => ({
    name: displayDueDate(date),
    tasks: upcoming?.filter((task) => task.due?.date === date) || [],
  }));

  if (overdue.length > 0) {
    sections.unshift({
      name: "Overdue",
      tasks: overdue,
    });
  }

  return sections;
}

export function getSectionsWithPriorities(tasks: Task[]) {
  return priorities.map(({ name, value }) => ({
    name,
    tasks: tasks?.filter((task) => task.priority === value) || [],
  }));
}

export function getSectionsWithProjects({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  return (
    projects.map((project) => ({
      name: project.name,
      tasks: tasks?.filter((task) => task.projectId === project.id) || [],
    })) || []
  );
}

export function getSectionsWithLabels({ tasks, labels }: { tasks: Task[]; labels: Label[] }) {
  const tasksWithoutLabels = tasks?.filter((task) => task.labels.length === 0);

  const sections =
    labels?.map((label) => {
      return {
        name: label.name,
        tasks: tasks?.filter((task) => task.labels.includes(label.id)) || [],
      };
    }) || [];

  if (tasksWithoutLabels) {
    sections.push({
      name: "No label",
      tasks: tasksWithoutLabels,
    });
  }

  return sections;
}
