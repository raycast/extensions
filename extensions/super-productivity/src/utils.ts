import type { Project, Tag } from "./types";

export function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getProjectTitle(
  projectId: string | undefined,
  projects: Project[],
): string {
  if (!projectId) return "Inbox";
  const project = projects.find((p) => p.id === projectId);
  return project ? project.title : projectId;
}

export function getTagTitles(
  tagIds: string[] | undefined,
  tags: Tag[],
): string {
  if (!tagIds || tagIds.length === 0) return "";
  return tagIds
    .map((id) => {
      const tag = tags.find((t) => t.id === id);
      return tag ? `#${tag.title}` : "";
    })
    .filter(Boolean)
    .join(" ");
}
