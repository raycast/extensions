import { Image } from "@raycast/api";

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
  [ProjectStateType.backlog]: { light: "light/backlog.svg", dark: "dark/backlog.svg" },
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
