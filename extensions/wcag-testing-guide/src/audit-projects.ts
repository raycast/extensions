/** Named, independent local audits. The original single-audit keys are retained as the default. */
import type { WcagVersion } from "./types";
import { AUDIT_STORAGE_KEY } from "./audit";

export type AuditProject = { id: string; name: string; createdAt: string };
export const DEFAULT_PROJECT: AuditProject = {
  id: "default",
  name: "My First Audit",
  createdAt: "",
};
export const AUDIT_PROJECTS_KEY = "wcag-audit-projects-v1";
export const AUDIT_ACTIVE_PROJECT_KEY = "wcag-audit-active-project-v1";
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{20,40}$/i;

export function projectStorageKey(
  projectId: string,
  version: WcagVersion,
): string {
  if (projectId === "default") return AUDIT_STORAGE_KEY(version); // preserve v2.6 data
  if (!ID_PATTERN.test(projectId)) throw new Error("Invalid audit identifier");
  return `wcag-audit-results-project-${projectId}-${version}-v1`;
}

export function parseAuditProjects(raw: unknown): AuditProject[] {
  if (typeof raw !== "string") return [DEFAULT_PROJECT];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [DEFAULT_PROJECT];
    const seen = new Set(["default"]);
    const projects = [DEFAULT_PROJECT];
    for (const entry of data) {
      if (!entry || typeof entry !== "object") continue;
      const p = entry as Partial<AuditProject>;
      if (typeof p.id !== "string" || !ID_PATTERN.test(p.id) || seen.has(p.id))
        continue;
      if (typeof p.name !== "string" || !p.name.trim() || p.name.length > 90)
        continue;
      seen.add(p.id);
      projects.push({
        id: p.id,
        name: p.name.trim(),
        createdAt: typeof p.createdAt === "string" ? p.createdAt : "",
      });
    }
    return projects.slice(0, 100);
  } catch {
    return [DEFAULT_PROJECT];
  }
}

export function safeActiveProjectId(
  raw: unknown,
  projects: AuditProject[],
): string {
  return typeof raw === "string" && projects.some((p) => p.id === raw)
    ? raw
    : "default";
}
