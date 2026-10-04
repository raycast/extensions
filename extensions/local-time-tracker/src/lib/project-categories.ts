import type { Project, ProjectCategory } from "./types";

const LEGACY_PROJECT_CATEGORIES: ProjectCategory[] = [
  { id: "client", name: "Client", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "internal", name: "Internal", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
];

export function getLegacyProjectCategories(projects: Project[]): ProjectCategory[] {
  const hasLegacyProjects = projects.some((project) => project.type === "client" || project.type === "internal");
  return hasLegacyProjects ? LEGACY_PROJECT_CATEGORIES.map((category) => ({ ...category })) : [];
}
