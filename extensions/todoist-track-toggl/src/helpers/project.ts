import { Icon } from "@raycast/api";

import { Project } from "@doist/todoist-api-typescript";

import { getColorByKey } from "@doist/todoist-api-typescript";

export function getProjectUrl(id: string) {
  return `https://todoist.com/app/project/${id}`;
}

export function getProjectAppUrl(id: string) {
  return `todoist://project?id=${id}`;
}

export function getProjectIcon(project: Project) {
  let source = project.viewStyle === "list" ? Icon.List : Icon.BarChart;

  if (project.isInboxProject || project.isTeamInbox) {
    source = Icon.Tray;
  }

  if (project.isShared) {
    source = Icon.Person;
  }

  return { source, tintColor: getColorByKey(project.color).value };
}
