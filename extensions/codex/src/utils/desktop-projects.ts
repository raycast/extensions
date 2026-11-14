import { readFile, stat } from "node:fs/promises";
import nodePath from "node:path";

const globalStateFilename = ".codex-global-state.json";

type JsonRecord = Record<string, unknown>;

export type CodexProjectRoot = {
  path: string;
  isAvailable: boolean;
};

export type CodexDesktopProject = {
  id: string;
  name: string;
  roots: CodexProjectRoot[];
  // Seconds, matching thread timestamps. Codex stores these as milliseconds and
  // they are converted when the global state file is parsed.
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  threadIds: string[];
};

export const codexProjectSortOrders = [
  "default",
  "name",
  "thread-count",
  "folder-count",
] as const;

export type CodexProjectSortOrder = (typeof codexProjectSortOrders)[number];

export function isCodexProjectSortOrder(
  value: string,
): value is CodexProjectSortOrder {
  return (codexProjectSortOrders as readonly string[]).includes(value);
}

export type ParsedCodexDesktopProject = Omit<CodexDesktopProject, "roots"> & {
  rootPaths: string[];
};

type CodexProjectRecord = Omit<
  ParsedCodexDesktopProject,
  "isPinned" | "threadIds"
>;

export function parseCodexDesktopProjects(
  state: unknown,
): ParsedCodexDesktopProject[] {
  if (!isRecord(state)) {
    throw new Error("Codex global state must be a JSON object.");
  }

  const projectsById = parseProjectsById(state["local-projects"]);
  const orderedProjectIds = buildOrderedProjectIds(
    projectsById,
    state["project-order"],
  );
  const pinnedProjectIds = parseStringSet(state["pinned-project-ids"]);
  const projectlessThreadIds = parseStringSet(state["projectless-thread-ids"]);
  const threadIdsByProjectId = parseThreadAssignments(
    state["thread-project-assignments"],
    projectsById,
    projectlessThreadIds,
  );

  return orderedProjectIds.map((projectId) => {
    const project = projectsById.get(projectId);
    if (!project) {
      throw new Error(`Missing parsed Codex Project: ${projectId}`);
    }

    return {
      ...project,
      isPinned: pinnedProjectIds.has(projectId),
      threadIds: threadIdsByProjectId.get(projectId) ?? [],
    };
  });
}

export async function loadCodexDesktopProjects(
  codexHome: string,
): Promise<CodexDesktopProject[]> {
  const state = await readCodexGlobalState(codexHome);
  const projects = parseCodexDesktopProjects(state);
  const availabilityByPath = await resolveRootAvailability(projects);

  return projects.map(({ rootPaths, ...project }) => ({
    ...project,
    roots: rootPaths.map((path) => ({
      path,
      isAvailable: availabilityByPath.get(path) ?? false,
    })),
  }));
}

// Projects often share folders, so each distinct path is checked once per load.
async function resolveRootAvailability(
  projects: readonly ParsedCodexDesktopProject[],
): Promise<Map<string, boolean>> {
  const distinctPaths = Array.from(
    new Set(projects.flatMap((project) => project.rootPaths)),
  );

  return new Map(
    await Promise.all(
      distinctPaths.map(
        async (path) => [path, await isDirectory(path)] as const,
      ),
    ),
  );
}

export function sortCodexDesktopProjects(
  projects: readonly CodexDesktopProject[],
  sortOrder: CodexProjectSortOrder,
): CodexDesktopProject[] {
  if (sortOrder === "default") {
    return [...projects];
  }

  // Array.prototype.sort is stable, so ties keep the default Codex order.
  return [...projects].sort((left, right) => {
    if (sortOrder === "name") {
      return left.name.localeCompare(right.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }

    if (sortOrder === "thread-count") {
      return right.threadIds.length - left.threadIds.length;
    }

    return right.roots.length - left.roots.length;
  });
}

async function readCodexGlobalState(codexHome: string): Promise<JsonRecord> {
  const primaryPath = nodePath.join(codexHome, globalStateFilename);

  try {
    return await readJsonObject(primaryPath);
  } catch (primaryError) {
    if (isFileNotFoundError(primaryError)) {
      return {};
    }

    const backupPath = `${primaryPath}.bak`;
    try {
      return await readJsonObject(backupPath);
    } catch {
      throw new Error(
        "Codex Project state is unreadable in both the primary and backup files.",
        { cause: primaryError },
      );
    }
  }
}

async function readJsonObject(path: string): Promise<JsonRecord> {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!isRecord(value)) {
    throw new Error("Codex global state must be a JSON object.");
  }

  return value;
}

function parseProjectsById(value: unknown): Map<string, CodexProjectRecord> {
  const projectsById = new Map<string, CodexProjectRecord>();
  if (!isRecord(value)) {
    return projectsById;
  }

  for (const [projectId, candidate] of Object.entries(value)) {
    if (!isRecord(candidate)) {
      continue;
    }

    const rootPaths = candidate.rootPaths;
    if (
      candidate.id !== projectId ||
      typeof candidate.name !== "string" ||
      !Array.isArray(rootPaths) ||
      !rootPaths.every((path): path is string => typeof path === "string") ||
      !isFiniteNumber(candidate.createdAt) ||
      !isFiniteNumber(candidate.updatedAt)
    ) {
      continue;
    }

    projectsById.set(projectId, {
      id: projectId,
      name: candidate.name.trim() || projectId,
      rootPaths: [...rootPaths],
      createdAt: Math.floor(candidate.createdAt / 1000),
      updatedAt: Math.floor(candidate.updatedAt / 1000),
    });
  }

  return projectsById;
}

function buildOrderedProjectIds(
  projectsById: Map<string, unknown>,
  projectOrder: unknown,
): string[] {
  const orderedProjectIds: string[] = [];
  const seenProjectIds = new Set<string>();

  if (Array.isArray(projectOrder)) {
    for (const projectId of projectOrder) {
      if (
        typeof projectId === "string" &&
        projectsById.has(projectId) &&
        !seenProjectIds.has(projectId)
      ) {
        orderedProjectIds.push(projectId);
        seenProjectIds.add(projectId);
      }
    }
  }

  for (const projectId of projectsById.keys()) {
    if (!seenProjectIds.has(projectId)) {
      orderedProjectIds.push(projectId);
    }
  }

  return orderedProjectIds;
}

function parseThreadAssignments(
  value: unknown,
  projectsById: Map<string, unknown>,
  projectlessThreadIds: Set<string>,
): Map<string, string[]> {
  const threadIdsByProjectId = new Map<string, string[]>();
  if (!isRecord(value)) {
    return threadIdsByProjectId;
  }

  for (const [threadId, assignment] of Object.entries(value)) {
    if (
      !threadId ||
      projectlessThreadIds.has(threadId) ||
      !isRecord(assignment) ||
      assignment.projectKind !== "local" ||
      typeof assignment.projectId !== "string" ||
      !projectsById.has(assignment.projectId)
    ) {
      continue;
    }

    const projectThreadIds =
      threadIdsByProjectId.get(assignment.projectId) ?? [];
    projectThreadIds.push(threadId);
    threadIdsByProjectId.set(assignment.projectId, projectThreadIds);
  }

  return threadIdsByProjectId;
}

function parseStringSet(value: unknown): Set<string> {
  return new Set(
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === "string")
      : [],
  );
}

async function isDirectory(path: string): Promise<boolean> {
  if (!nodePath.isAbsolute(path)) {
    return false;
  }

  const stats = await stat(path).catch(() => undefined);
  return stats?.isDirectory() ?? false;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileNotFoundError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
}
