import { Icon } from "@raycast/api";

import { Project } from "../api";

import { getColorByKey } from "./colors";

export function getProjectUrl(id: string) {
  return `https://todoist.com/app/project/${id}`;
}

export function getProjectAppUrl(id: string) {
  return `todoist://project?id=${id}`;
}

export function getProjectIcon(project: Project) {
  let source = project.view_style === "list" ? Icon.List : Icon.BarChart;

  if (project.inbox_project || project.team_inbox) {
    source = Icon.Tray;
  }

  if (project.shared) {
    source = Icon.Person;
  }

  return { source, tintColor: getColorByKey(project.color).value };
}
