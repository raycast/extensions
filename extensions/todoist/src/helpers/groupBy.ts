import { Icon, Image } from "@raycast/api";
import { partition } from "lodash";
import React from "react";

import { Collaborator, Label, Project, Task, User } from "../api";
import { priorities } from "../helpers/priorities";

import { displayDate, isOverdue, parseDay } from "./dates";

export type GroupByOption = "default" | "assignee" | "date" | "priority" | "label" | "project";

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

export const groupByOptions: GroupByOptions = [
  { label: "Default", icon: Icon.Document, value: "default" },
  { label: "Assignee", icon: Icon.Person, value: "assignee" },
  { label: "Date", icon: Icon.Calendar, value: "date" },
  { label: "Priority", icon: Icon.LevelMeter, value: "priority" },
  { label: "Label", icon: Icon.Tag, value: "label" },
  { label: "Project", icon: Icon.List, value: "project" },
];

export function getGroupByOptions(tasks: Task[], optionsToExclude?: GroupByOption[]) {
  const otherAssigneesExist = tasks.some((task) => !!task.responsible_uid);

  return groupByOptions.filter((option) => {
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

type GroupByAssigneesProps = {
  tasks: Task[];
  collaborators: Collaborator[];
  user?: User;
};

export function groupByAssignees({ tasks, collaborators, user }: GroupByAssigneesProps) {
  const [assignedTasks, unassignedTasks] = partition(tasks, (task) => task.responsible_uid);

  const assigneeIds = Array.from(new Set(assignedTasks.map((task) => task.responsible_uid)));

  const sections = assigneeIds.map((assigneeId) => {
    const collaborator = collaborators.find((c) => c.id === assigneeId);
    const assigneeName = collaborator ? (collaborator.id === user?.id ? "Me" : collaborator.full_name) : "Unknown";
    return {
      name: assigneeName,
      tasks: assignedTasks.filter((task) => task.responsible_uid === assigneeId),
    };
  });

  if (unassignedTasks.length > 0) {
    sections.push({
      name: "Unassigned",
      tasks: unassignedTasks,
    });
  }

  return sections;
}

export function groupByDates(tasks: Task[]) {
  const [dated, notdated] = partition(tasks, (task: Task) => task.due?.date);
  const [overdue, upcoming] = partition(dated, (task: Task) => task.due?.date && isOverdue(task.due.date));

  const allDates = [...new Set(upcoming.map((task) => parseDay(task.due?.date).toISOString()))] as string[];
  allDates.sort();

  const sections = allDates.map((date) => ({
    name: displayDate(date),
    tasks: upcoming?.filter((task) => parseDay(task.due?.date).toISOString() === date) || [],
  }));

  if (overdue.length > 0) {
    sections.unshift({
      name: "Overdue",
      tasks: overdue,
    });
  }
  if (notdated.length > 0) {
    sections.push({
      name: "No date",
      tasks: notdated,
    });
  }

  return sections;
}

export function groupByPriorities(tasks: Task[]) {
  return priorities.map(({ name, value }) => ({
    name,
    tasks: tasks?.filter((task) => task.priority === value) || [],
  }));
}

export function groupByLabels({ tasks, labels }: { tasks: Task[]; labels: Label[] }) {
  const tasksWithoutLabels = tasks?.filter((task) => task.labels.length === 0);

  const sections =
    labels?.map((label) => {
      return {
        name: label.name,
        tasks: tasks?.filter((task) => task.labels.includes(label.name)) || [],
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

export function groupByProjects({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  return (
    projects.map((project) => ({
      name: project.name,
      tasks: tasks?.filter((task) => task.project_id === project.id) || [],
    })) || []
  );
}
