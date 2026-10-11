import type { Project } from "./types";

export function findProject(projects: Project[], projectId: string): Project | undefined {
  return projects.find((project) => project.id === projectId);
}

export function getProjectName(projects: Project[], projectId: string): string {
  return findProject(projects, projectId)?.name ?? "Unknown Project";
}

export function sortProjectsByPreference(projects: Project[]): Project[] {
  return [...projects].sort((left, right) => {
    const preferenceOrder = Number(right.isPreferred === true) - Number(left.isPreferred === true);
    if (preferenceOrder !== 0) return preferenceOrder;
    return left.name.localeCompare(right.name);
  });
}
