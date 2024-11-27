import { Project } from "@linear/sdk";
import { Image } from "@raycast/api";
import { getIcon } from "./icons";

type IconAsset = {
  light: Image.Asset;
  dark: Image.Asset;
};

export enum ProjectStateType {
  backlog = "backlog",
  planned = "planned",
  started = "started",
  paused = "paused",
  completed = "completed",
  canceled = "canceled",
}

export const projectStatuses: ProjectStateType[] = [
  ProjectStateType.backlog,
  ProjectStateType.planned,
  ProjectStateType.started,
  ProjectStateType.paused,
  ProjectStateType.completed,
  ProjectStateType.canceled,
];

export const projectStatusIcon: Record<string, IconAsset> = {
  [ProjectStateType.backlog]: { light: "light/project-backlog.svg", dark: "dark/project-backlog.svg" },
  [ProjectStateType.planned]: { light: "light/project-planned.svg", dark: "dark/project-planned.svg" },
  [ProjectStateType.started]: { light: "light/project-started.svg", dark: "dark/project-started.svg" },
  [ProjectStateType.paused]: { light: "light/project-paused.svg", dark: "dark/project-paused.svg" },
  [ProjectStateType.completed]: { light: "light/project-completed.svg", dark: "dark/project-completed.svg" },
  [ProjectStateType.canceled]: { light: "light/project-canceled.svg", dark: "dark/project-canceled.svg" },
};

export const projectStatusText: Record<string, string> = {
  backlog: "Backlog",
  planned: "Planned",
  started: "In Progress",
  paused: "Paused",
  completed: "Completed",
  canceled: "Canceled",
};

export function getProjectIcon(project?: Pick<Project, "icon" | "color">) {
  if (!project) {
    return { source: { light: "light/no-project.svg", dark: "dark/no-project.svg" } };
  }

  return getIcon({
    icon: project.icon,
    color: project.color,
    fallbackIcon: { source: { light: "light/project.svg", dark: "dark/project.svg" } },
  });
}
