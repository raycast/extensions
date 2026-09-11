import type { DescriptComposition, DescriptMediaFile, DescriptProject } from "./types";

export type NormalizedProject = {
  id: string;
  name: string;
  projectUrl?: string;
  folderPath?: string;
  updatedAt?: string;
  createdAt?: string;
  driveId?: string;
  compositions?: DescriptComposition[];
  mediaFiles?: Record<string, DescriptMediaFile>;
};

/**
 * The list and detail endpoints occasionally use slightly different field
 * names (e.g. `id` vs `project_id`, `name` vs `title`). This normalizer hides
 * those inconsistencies so callers can rely on a single shape.
 */
export function normalizeProject(project: DescriptProject & Record<string, unknown>): NormalizedProject {
  const pick = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = project[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
    return undefined;
  };

  const compositions = Array.isArray(project.compositions)
    ? (project.compositions as DescriptComposition[])
    : undefined;
  const mediaFiles =
    project.media_files && typeof project.media_files === "object"
      ? (project.media_files as Record<string, DescriptMediaFile>)
      : undefined;

  return {
    id: pick("id", "project_id", "projectId") ?? "",
    name: pick("name", "title", "project_name") ?? "Untitled project",
    projectUrl: pick("project_url", "projectUrl", "url"),
    folderPath: pick("folder_path", "folderPath"),
    updatedAt: pick("updated_at", "updatedAt"),
    createdAt: pick("created_at", "createdAt"),
    driveId: pick("drive_id", "driveId"),
    compositions,
    mediaFiles,
  };
}

export function projectUrlFromId(project: NormalizedProject): string | undefined {
  if (project.projectUrl) return project.projectUrl;
  if (project.id) return `https://web.descript.com/${project.id}`;
  return undefined;
}

// Descript composition URLs use the 5-char short id, which is the first five
// characters of the composition UUID (e.g. `2aeba` from `2aeba1f4-...`). The
// API also accepts this short id wherever a composition_id is allowed.
function compositionShortId(compositionId: string): string {
  return compositionId.trim().slice(0, 5);
}

export function compositionUrl(project: NormalizedProject, composition: { id: string }): string | undefined {
  const base = projectUrlFromId(project);
  if (!base || !composition.id) return base;
  const root = base.replace(/\/+$/, "");
  return `${root}/${compositionShortId(composition.id)}`;
}

export function totalMediaDuration(mediaFiles: Record<string, DescriptMediaFile> | undefined): number | undefined {
  if (!mediaFiles) return undefined;
  let total = 0;
  let counted = 0;
  for (const file of Object.values(mediaFiles)) {
    if (typeof file?.duration === "number" && Number.isFinite(file.duration)) {
      total += file.duration;
      counted += 1;
    }
  }
  return counted > 0 ? total : undefined;
}

export function totalCompositionDuration(compositions: DescriptComposition[] | undefined): number | undefined {
  if (!compositions) return undefined;
  let total = 0;
  let counted = 0;
  for (const comp of compositions) {
    if (typeof comp?.duration === "number" && Number.isFinite(comp.duration)) {
      total += comp.duration;
      counted += 1;
    }
  }
  return counted > 0 ? total : undefined;
}

export function mediaFileCount(mediaFiles: Record<string, DescriptMediaFile> | undefined): number {
  return mediaFiles ? Object.keys(mediaFiles).length : 0;
}

export function compositionCount(compositions: DescriptComposition[] | undefined): number {
  return compositions ? compositions.length : 0;
}
