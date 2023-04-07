import { getColorByKey, Project } from "@doist/todoist-api-typescript";
import { Icon } from "@raycast/api";

export function getProjectIcon(project: Project) {
  return project.isInboxProject
    ? Icon.Envelope
    : {
        source: project.viewStyle === "list" ? Icon.List : Icon.BarChart,
        tintColor: getColorByKey(project.color).hexValue,
      };
}
