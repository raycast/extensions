import type { Project, Tag } from "./types";

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayStr(): string {
  return formatLocalDate(new Date());
}

export function getProjectTitle(projectId: string | undefined, projects: Project[]): string {
  if (!projectId) return "Inbox";
  const project = projects.find((p) => p.id === projectId);
  return project ? project.title : projectId;
}

export function getTagTitles(tagIds: string[] | undefined, tags: Tag[]): string {
  if (!tagIds || tagIds.length === 0) return "";
  return tagIds
    .map((id) => {
      const tag = tags.find((t) => t.id === id);
      return tag ? `#${tag.title}` : "";
    })
    .filter(Boolean)
    .join(" ");
}
