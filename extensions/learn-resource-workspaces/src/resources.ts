import path from "node:path";
import os from "node:os";

export const RESOURCE_STATUSES = ["pending", "ingested", "failed"] as const;
export const RESOURCE_TYPES = [
  "web",
  "pdf",
  "video",
  "repos",
  "local",
] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];
export type ResourceType = (typeof RESOURCE_TYPES)[number];
export interface LearnResource {
  source: string;
  type: ResourceType;
  status: ResourceStatus;
  tags: string[];
  title?: string;
  output?: string;
  adapter?: string;
  addedAt?: string;
  ingestedAt?: string;
}
export interface WorkspaceResources {
  workspace: string;
  path: string;
  resources: LearnResource[];
}
export interface ResourceFilters {
  status: string;
  type: string;
  tag: string;
}
export const EMPTY_FILTERS: ResourceFilters = { status: "", type: "", tag: "" };

export function parseWorkspaceResources(
  stdout: string,
  workspace: string,
): WorkspaceResources {
  const data: unknown = JSON.parse(stdout);
  if (!data || typeof data !== "object")
    throw new Error("Invalid resource list");
  const obj = data as Record<string, unknown>;
  if (
    obj.workspace !== workspace ||
    typeof obj.path !== "string" ||
    !path.isAbsolute(obj.path) ||
    !Array.isArray(obj.resources)
  ) {
    throw new Error("Invalid resource list");
  }
  for (const resource of obj.resources) {
    if (!resource || typeof resource !== "object")
      throw new Error("Invalid resource entry");
    const r = resource as Record<string, unknown>;
    if (
      typeof r.source !== "string" ||
      !RESOURCE_TYPES.includes(r.type as ResourceType) ||
      !RESOURCE_STATUSES.includes(r.status as ResourceStatus) ||
      !Array.isArray(r.tags) ||
      !r.tags.every((tag) => typeof tag === "string")
    ) {
      throw new Error("Invalid resource entry");
    }
    for (const key of ["title", "output", "adapter", "addedAt", "ingestedAt"]) {
      if (r[key] !== undefined && typeof r[key] !== "string")
        throw new Error("Invalid resource entry");
    }
  }
  return obj as unknown as WorkspaceResources;
}

export function filterResources(
  resources: LearnResource[],
  filters: ResourceFilters,
  query: string,
): LearnResource[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return resources.filter((r) => {
    const text = [r.title, r.source, ...r.tags].join(" ").toLowerCase();
    return (
      (!filters.status || r.status === filters.status) &&
      (!filters.type || r.type === filters.type) &&
      (!filters.tag || r.tags.includes(filters.tag)) &&
      terms.every((term) => text.includes(term))
    );
  });
}

export function parseTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

export function normalizeResourceSource(value: string): string {
  const source = value.trim();
  if (!source || source.includes(String.fromCharCode(0)))
    throw new Error("Enter an HTTP/HTTPS URL or an absolute local path");
  if (source.startsWith("~/")) return path.join(os.homedir(), source.slice(2));
  if (path.isAbsolute(source)) return source;
  try {
    const url = new URL(source);
    if (url.protocol === "http:" || url.protocol === "https:") return source;
  } catch {
    /* Report the supported formats below. */
  }
  throw new Error("Enter an HTTP/HTTPS URL or an absolute local path");
}

export function resourceOutputPath(
  workspacePath: string,
  output: string,
): string {
  return path.resolve(workspacePath, output);
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
