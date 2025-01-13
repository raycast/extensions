import { Color, type List } from "@raycast/api";
import type { Project } from "../../types/project";
import { getRelativeTimeTag } from "./get-relative-time-tag";

export function getProjectAccessories(project: Project) {
  const accessories: List.Item.Accessory[] = [
    // Add the relative time tag first
    getRelativeTimeTag(project.lastModifiedTime),
  ];

  if (project.gitBranch) {
    accessories.unshift({ tag: { value: project.gitBranch, color: Color.Green } });
  }

  if (project.diskSize) {
    accessories.unshift({ tag: { value: project.diskSize, color: Color.Blue } });
  }

  return accessories;
}
