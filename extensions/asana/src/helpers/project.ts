import { Color } from "@raycast/api";
import { Project } from "../api/projects";
import { asanaToRaycastColor } from "./colors";

export function getProjectIcon(project: Project) {
  return {
    source: `asana-project-icon-${project.icon}-16.svg`,
    tintColor: project.color ? asanaToRaycastColor(project.color) : Color.PrimaryText,
  };
}
