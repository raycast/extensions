import { getPaneIcon, PaneIcon } from "./icons";

export interface Project {
  id: string;
  name: string;
  dir?: string;
}

export interface Pane {
  id: string;
  title?: string;
  dir?: string;
  processDir?: string;
  process?: string;
  shell?: string;
  agent?: string;
  runtime?: string;
  url?: string;
  status?: string;
  progress?: number;
  git?: { branch?: string };
}

export interface Session {
  id: string;
  name?: string;
  title?: string;
  project?: string;
  panes: Pane[];
}

export type StatusFilter = "all" | "attention" | "working" | "idle" | "exited";
export type PaneStatus = "working" | "waiting" | "idle" | "error" | "exited" | "unknown";

export interface PaneItem {
  id: string;
  sessionId: string;
  projectId: string;
  title: string;
  directory?: string;
  program?: string;
  branch?: string;
  icon: PaneIcon;
  status: PaneStatus;
  progress?: number;
  keywords: string[];
}

export interface PaneGroup {
  id: string;
  title: string;
  subtitle?: string;
  items: PaneItem[];
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: Record<string, unknown>, key: string): string | undefined {
  return typeof value[key] === "string" ? value[key] : undefined;
}

function requireId(value: unknown): asserts value is Record<string, unknown> & { id: string } {
  if (!object(value) || typeof value.id !== "string" || !value.id) {
    throw new Error("Kero returned a record without a valid ID. Check your Kero version.");
  }
}

// Validate the fields we use, ignore additions, and tolerate absent optional fields.
export function parseSessions(value: unknown): Session[] {
  if (!Array.isArray(value)) throw new Error("Expected a session array from Kero. Check your Kero version.");
  const ids = new Set<string>();
  return value.map((session) => {
    requireId(session);
    if (!Array.isArray(session.panes)) throw new Error("Kero returned a session without a pane array.");
    return {
      id: session.id,
      name: optionalString(session, "name"),
      title: optionalString(session, "title"),
      project: optionalString(session, "project"),
      panes: session.panes.map((pane: unknown): Pane => {
        requireId(pane);
        if (ids.has(pane.id)) throw new Error("Kero returned duplicate pane IDs.");
        ids.add(pane.id);
        return {
          id: pane.id,
          title: optionalString(pane, "title"),
          dir: optionalString(pane, "dir"),
          processDir: optionalString(pane, "processDir"),
          process: optionalString(pane, "process"),
          shell: optionalString(pane, "shell"),
          agent: optionalString(pane, "agent"),
          runtime: optionalString(pane, "runtime"),
          url: optionalString(pane, "url"),
          status: optionalString(pane, "status"),
          progress: typeof pane.progress === "number" ? pane.progress : undefined,
          git: object(pane.git) ? { branch: optionalString(pane.git, "branch") } : undefined,
        };
      }),
    };
  });
}

export function parseProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) throw new Error("Expected a project array from Kero. Check your Kero version.");
  return value.map((project) => {
    requireId(project);
    return {
      id: project.id,
      name: optionalString(project, "name") || project.id,
      dir: optionalString(project, "dir"),
    };
  });
}

export function normalizeStatus(status?: string): PaneStatus {
  switch (status) {
    case "working":
    case "waiting":
    case "idle":
    case "error":
    case "exited":
      return status;
    default:
      return "unknown";
  }
}

export function matchesStatus(status: PaneStatus, filter: StatusFilter): boolean {
  return filter === "all" || (filter === "attention" ? status === "waiting" || status === "error" : status === filter);
}

// A user-facing program label, not the raw Kero `process` field: Kero leaves
// that field empty when the pane's own shell is in the foreground.
function currentProgram(pane: Pane): string | undefined {
  if (pane.status === "exited") return undefined;
  if (pane.url) return "Browser";
  return pane.agent || pane.process || pane.shell || undefined;
}

export function buildGroups(sessions: Session[], projects: Project[]): PaneGroup[] {
  // Map insertion order preserves the project's sidebar order. Never sort by live status.
  const groups = new Map<string, PaneGroup>(
    projects.map((project) => [project.id, { id: project.id, title: project.name, subtitle: project.dir, items: [] }]),
  );
  for (const session of sessions) {
    const projectId = session.project || "unassigned";
    let group = groups.get(projectId);
    if (!group) {
      group = { id: projectId, title: session.project ? `Project ${projectId}` : "Other Sessions", items: [] };
      groups.set(projectId, group);
    }
    for (const pane of session.panes) {
      const directory = pane.processDir || pane.dir;
      const sessionTitle = session.name || session.title || session.id;
      const paneTitle = pane.title || pane.agent || pane.process || pane.id;
      const title =
        session.panes.length > 1 ? `${sessionTitle} › ${paneTitle}` : session.name || pane.title || sessionTitle;
      const progress = pane.progress;
      const program = currentProgram(pane);
      group.items.push({
        id: pane.id,
        sessionId: session.id,
        projectId,
        title,
        directory,
        program,
        branch: pane.git?.branch,
        icon: getPaneIcon(pane),
        status: normalizeStatus(pane.status),
        progress:
          progress !== undefined && Number.isFinite(progress) && progress >= 0 && progress <= 100
            ? progress
            : undefined,
        keywords: [
          group.title,
          group.subtitle,
          projectId,
          session.id,
          session.name,
          session.title,
          pane.id,
          pane.title,
          pane.dir,
          pane.processDir,
          pane.agent,
          pane.process,
          pane.runtime,
          program,
          pane.git?.branch,
        ].filter((value): value is string => Boolean(value)),
      });
    }
  }
  return [...groups.values()].filter((group) => group.items.length > 0);
}
