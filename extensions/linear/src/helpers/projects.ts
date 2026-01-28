import { Project } from "@linear/sdk";
import { ProjectStatusType } from "@linear/sdk/dist/_generated_documents";
import { Image } from "@raycast/api";

import { getIcon } from "./icons";

type IconAsset = {
  light: Image.Asset;
  dark: Image.Asset;
};

export const projectStatusIcon: Record<ProjectStatusType, IconAsset> = {
  backlog: { light: "light/project-backlog.svg", dark: "dark/project-backlog.svg" },
  planned: { light: "light/project-planned.svg", dark: "dark/project-planned.svg" },
  started: { light: "light/project-started.svg", dark: "dark/project-started.svg" },
  paused: { light: "light/project-paused.svg", dark: "dark/project-paused.svg" },
  completed: { light: "light/project-completed.svg", dark: "dark/project-completed.svg" },
  canceled: { light: "light/project-canceled.svg", dark: "dark/project-canceled.svg" },
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
