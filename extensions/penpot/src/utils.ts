import { Project } from "../types";

export function iconAssetUri(thumbnailId: string) {
  const endpoint = "https://design.penpot.app/";
  return `${endpoint}assets/by-id/${thumbnailId}`;
}

export function groupByTeam(projects: Project[]): Record<string, Project[]> {
  return projects.reduce<Record<string, Project[]>>((acc, project) => {
    const key = project.teamName ?? "";
    if (!acc[key]) acc[key] = [];
    acc[key].push(project);
    return acc;
  }, {});
}
